import type { ChatThreadDocument } from './chat-thread.model.js';
import type { MessageDocument } from './message.model.js';

export interface ThreadParticipant {
  id: string;
  displayName: string;
}

export interface ThreadSummary {
  id: string;
  /** The profile the conversation is about. */
  profile: { handle: string; displayName: string; avatarUrl?: string };
  /** The other person — never the caller. */
  other: ThreadParticipant;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  /** Unread count for the caller only; the other side's is never disclosed. */
  unreadCount: number;
  createdAt: string;
}

export interface MessageView {
  id: string;
  body: string;
  senderId: string;
  /** Saves the client from comparing ids to decide which side to render on. */
  isMine: boolean;
  createdAt: string;
}

export function toThreadSummary(
  thread: ChatThreadDocument,
  viewerId: string,
  other: ThreadParticipant,
  profile: { handle: string; displayName: string; avatarUrl?: string },
): ThreadSummary {
  const unread = thread.unread.find((entry) => String(entry.user) === viewerId)?.count ?? 0;

  return {
    id: String(thread.id),
    profile,
    other,
    ...(thread.lastMessageAt ? { lastMessageAt: thread.lastMessageAt.toISOString() } : {}),
    ...(thread.lastMessagePreview ? { lastMessagePreview: thread.lastMessagePreview } : {}),
    unreadCount: unread,
    createdAt: thread.createdAt.toISOString(),
  };
}

export function toMessageView(message: MessageDocument, viewerId: string): MessageView {
  return {
    id: String(message.id),
    body: message.body,
    senderId: String(message.sender),
    isMine: String(message.sender) === viewerId,
    createdAt: message.createdAt.toISOString(),
  };
}
