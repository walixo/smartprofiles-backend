import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/parse-query.js';
import { MESSAGE_MAX_LENGTH } from './message.model.js';

const bodySchema = z
  .string()
  .trim()
  .min(1, 'Write a message first.')
  .max(MESSAGE_MAX_LENGTH, 'That message is too long.');

/**
 * A thread is opened against a profile handle rather than a user id — the
 * client only ever knows the handle, and it keeps user ids out of the URL.
 */
export const startThreadSchema = z.object({
  handle: z.string().trim().toLowerCase().min(3).max(30),
  body: bodySchema,
});

export const sendMessageSchema = z.object({
  body: bodySchema,
});

export const messagesQuerySchema = paginationQuerySchema;

export type StartThreadInput = z.infer<typeof startThreadSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
