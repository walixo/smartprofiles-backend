import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose';
import { THREAD_STATUSES, type ThreadStatus } from '../../shared/vocabulary.js';

export interface ThreadUnread {
  user: Types.ObjectId;
  count: number;
}

export interface ChatThreadAttrs {
  /** Exactly two, stored sorted so `pairKey` is deterministic. */
  participants: Types.ObjectId[];
  /** The profile the conversation started from — context for both sides. */
  profile: Types.ObjectId;
  /**
   * `sortedUserA:sortedUserB:profile`.
   *
   * A unique index on the `participants` array would be multikey and enforce
   * uniqueness per element rather than per pair, so the pair is flattened into
   * one scalar the database can actually constrain.
   */
  pairKey: string;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  unread: ThreadUnread[];
  status: ThreadStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatThreadDocument = HydratedDocument<ChatThreadAttrs>;

const unreadSchema = new Schema<ThreadUnread>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    count: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);

const chatThreadSchema = new Schema<ChatThreadAttrs, Model<ChatThreadAttrs>>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      validate: { validator: (v: unknown[]) => v.length === 2, message: 'A thread has exactly two participants.' },
    },
    profile: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    pairKey: { type: String, required: true, unique: true },
    lastMessageAt: { type: Date },
    lastMessagePreview: { type: String, maxlength: 140 },
    unread: { type: [unreadSchema], default: [] },
    status: { type: String, required: true, enum: THREAD_STATUSES, default: 'open' },
  },
  { timestamps: true },
);

// Inbox query: my threads, newest activity first.
chatThreadSchema.index({ participants: 1, lastMessageAt: -1 });

export const ChatThread = model<ChatThreadAttrs, Model<ChatThreadAttrs>>('ChatThread', chatThreadSchema);

/** Deterministic key for a participant pair scoped to one profile. */
export function buildPairKey(userA: string, userB: string, profileId: string): string {
  return [...[userA, userB].sort(), profileId].join(':');
}
