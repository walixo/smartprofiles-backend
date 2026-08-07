import { Types } from 'mongoose';
import { ApiError } from '../../utils/api-error.js';
import { buildPageMeta, toSkip, type PageMeta, type PaginationQuery } from '../../utils/parse-query.js';
import { Profile } from '../profiles/profile.model.js';
import { User } from '../users/user.model.js';
import { buildPairKey, ChatThread, type ChatThreadDocument } from './chat-thread.model.js';
import { toMessageView, toThreadSummary, type MessageView, type ThreadSummary } from './chat.dto.js';
import { Message } from './message.model.js';
import type { StartThreadInput } from './chat.schema.js';

const PREVIEW_LENGTH = 140;

export async function listThreads(userId: string): Promise<ThreadSummary[]> {
  const threads = await ChatThread.find({ participants: userId, status: 'open' }).sort({
    lastMessageAt: -1,
    _id: -1,
  });

  if (threads.length === 0) return [];

  // Two batched lookups rather than a query per thread.
  const otherIds = threads.map((thread) => otherParticipantOf(thread, userId));
  const profileIds = threads.map((thread) => thread.profile);

  const profiles = await Profile.find({ _id: { $in: profileIds } }).select('handle user avatarUrl');

  // One user query covering both the other participants and the profile owners,
  // rather than a lookup per thread.
  const names = await User.find({
    _id: { $in: [...otherIds, ...profiles.map((profile) => profile.user)] },
  }).select('displayName');

  const nameById = new Map(names.map((user) => [String(user.id), user.displayName]));
  const profileById = new Map(profiles.map((profile) => [String(profile.id), profile]));

  return threads.map((thread) => {
    const otherId = String(otherParticipantOf(thread, userId));
    const profile = profileById.get(String(thread.profile));

    return toThreadSummary(
      thread,
      userId,
      { id: otherId, displayName: nameById.get(otherId) ?? 'Unknown' },
      {
        handle: profile?.handle ?? 'unknown',
        displayName: profile ? (nameById.get(String(profile.user)) ?? 'Unknown') : 'Unknown',
        ...(profile?.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
      },
    );
  });
}

export async function startThread(
  userId: string,
  input: StartThreadInput,
): Promise<{ threadId: string }> {
  const profile = await Profile.findOne({ handle: input.handle });

  if (!profile || profile.visibility === 'draft') {
    throw ApiError.notFound('We could not find that profile.', undefined, 'PROFILE_NOT_FOUND');
  }

  const ownerId = String(profile.user);

  if (ownerId === userId) {
    throw ApiError.badRequest('You cannot message your own profile.', undefined, 'CANNOT_MESSAGE_SELF');
  }

  if (!profile.contact.allowChat) {
    throw ApiError.forbidden(
      'This freelancer is not accepting messages.',
      undefined,
      'CHAT_NOT_ACCEPTED',
    );
  }

  const pairKey = buildPairKey(userId, ownerId, String(profile.id));
  let thread = await ChatThread.findOne({ pairKey });

  if (!thread) {
    thread = await ChatThread.create({
      participants: [userId, ownerId].sort().map((id) => new Types.ObjectId(id)),
      profile: profile.id,
      pairKey,
      unread: [
        { user: new Types.ObjectId(userId), count: 0 },
        { user: new Types.ObjectId(ownerId), count: 0 },
      ],
      status: 'open',
    });
  }

  await appendMessage(thread, userId, input.body);

  return { threadId: String(thread.id) };
}

export async function getMessages(
  userId: string,
  threadId: string,
  pagination: PaginationQuery,
): Promise<{ messages: MessageView[]; meta: PageMeta }> {
  const thread = await requireMembership(userId, threadId);

  const [messages, total] = await Promise.all([
    // Newest first for pagination, reversed below so the view reads naturally.
    Message.find({ thread: thread.id }).sort({ createdAt: -1, _id: -1 }).skip(toSkip(pagination)).limit(pagination.limit),
    Message.countDocuments({ thread: thread.id }),
  ]);

  return {
    messages: messages.reverse().map((message) => toMessageView(message, userId)),
    meta: buildPageMeta(pagination, total),
  };
}

export async function sendMessage(userId: string, threadId: string, body: string): Promise<MessageView> {
  const thread = await requireMembership(userId, threadId);
  const message = await appendMessage(thread, userId, body);
  return toMessageView(message, userId);
}

export async function markThreadRead(userId: string, threadId: string): Promise<{ unreadCount: number }> {
  const thread = await requireMembership(userId, threadId);

  await ChatThread.updateOne(
    { _id: thread.id, 'unread.user': new Types.ObjectId(userId) },
    { $set: { 'unread.$.count': 0 } },
  );

  return { unreadCount: 0 };
}

/** Total unread across every open thread, for the header badge. */
export async function countUnread(userId: string): Promise<number> {
  const threads = await ChatThread.find({ participants: userId, status: 'open' }).select('unread');
  return threads.reduce(
    (total, thread) => total + (thread.unread.find((e) => String(e.user) === userId)?.count ?? 0),
    0,
  );
}

/* ------------------------------------------------------------------ */

async function appendMessage(thread: ChatThreadDocument, senderId: string, body: string) {
  const message = await Message.create({ thread: thread.id, sender: senderId, body });

  const recipientId = otherParticipantOf(thread, senderId);

  // One atomic update: bump the recipient's unread and refresh the preview.
  await ChatThread.updateOne(
    { _id: thread.id, 'unread.user': recipientId },
    {
      $inc: { 'unread.$.count': 1 },
      $set: {
        lastMessageAt: message.createdAt,
        lastMessagePreview: body.slice(0, PREVIEW_LENGTH),
      },
    },
  );

  return message;
}

/**
 * Resolves a thread and proves the caller belongs to it.
 *
 * A thread the caller is not part of is a 404, never a 403 — a 403 would
 * confirm that a given thread id exists.
 */
async function requireMembership(userId: string, threadId: string): Promise<ChatThreadDocument> {
  if (!Types.ObjectId.isValid(threadId)) {
    throw ApiError.notFound('We could not find that conversation.', undefined, 'THREAD_NOT_FOUND');
  }

  const thread = await ChatThread.findOne({ _id: threadId, participants: userId });

  if (!thread) {
    throw ApiError.notFound('We could not find that conversation.', undefined, 'THREAD_NOT_FOUND');
  }

  return thread;
}

function otherParticipantOf(thread: ChatThreadDocument, userId: string): Types.ObjectId {
  const other = thread.participants.find((participant) => String(participant) !== userId);
  if (!other) {
    throw ApiError.internal('This conversation is missing a participant.');
  }
  return other;
}
