import type { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess } from '../../utils/envelope.js';
import type { CreateWorkInput, ReorderWorksInput, UpdateWorkInput } from './work.schema.js';
import { createWork, deleteWork, listOwnWorks, reorderWorks, updateWork } from './work.service.js';

export const listOwn = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, { works: await listOwnWorks(requireUserId(req)) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const work = await createWork(requireUserId(req), req.body as CreateWorkInput);
  sendSuccess(res, { work }, 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const work = await updateWork(requireUserId(req), String(req.params.workId), req.body as UpdateWorkInput);
  sendSuccess(res, { work });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteWork(requireUserId(req), String(req.params.workId));
  res.status(204).send();
});

export const reorder = asyncHandler(async (req: Request, res: Response) => {
  const { order } = req.body as ReorderWorksInput;
  sendSuccess(res, { works: await reorderWorks(requireUserId(req), order) });
});

function requireUserId(req: Request): string {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required.', undefined, 'AUTH_REQUIRED');
  }
  return req.user.id;
}
