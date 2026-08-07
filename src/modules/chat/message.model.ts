import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

export const MESSAGE_MAX_LENGTH = 4000;

export interface MessageAttrs {
  thread: Types.ObjectId;
  sender: Types.ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageDocument = HydratedDocument<MessageAttrs>;

const messageSchema = new Schema<MessageAttrs, Model<MessageAttrs>>(
  {
    thread: { type: Schema.Types.ObjectId, ref: 'ChatThread', required: true, immutable: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: MESSAGE_MAX_LENGTH },
  },
  { timestamps: true },
);

// Conversation view reads one thread in chronological order.
messageSchema.index({ thread: 1, createdAt: 1 });

export const Message = model<MessageAttrs, Model<MessageAttrs>>('Message', messageSchema);
