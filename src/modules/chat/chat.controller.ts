import type { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess } from '../../utils/envelope.js';
import { parseQuery } from '../../utils/parse-query.js';
import { messagesQuerySchema, type SendMessageInput, type StartThreadInput } from './chat.schema.js';
import {
  countUnread,
  getMessages,
  listThreads,
  markThreadRead,
  sendMessage,
  startThread,
} from './chat.service.js';

export const listOwnThreads = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, { threads: await listThreads(requireUserId(req)) });
});

export const unreadTotal = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, { unreadCount: await countUnread(requireUserId(req)) });
});

export const start = asyncHandler(async (req: Request, res: Response) => {
  const result = await startThread(requireUserId(req), req.body as StartThreadInput);
  sendSuccess(res, result, 201);
});

export const messages = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parseQuery(messagesQuerySchema, req.query);
  const result = await getMessages(requireUserId(req), String(req.params.threadId), pagination);
  sendSuccess(res, result);
});

export const post = asyncHandler(async (req: Request, res: Response) => {
  const { body } = req.body as SendMessageInput;
  const message = await sendMessage(requireUserId(req), String(req.params.threadId), body);
  sendSuccess(res, { message }, 201);
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await markThreadRead(requireUserId(req), String(req.params.threadId));
  sendSuccess(res, result);
});

function requireUserId(req: Request): string {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required.', undefined, 'AUTH_REQUIRED');
  }
  return req.user.id;
}
