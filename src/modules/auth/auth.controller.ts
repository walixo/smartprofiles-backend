import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { ApiError } from '../../utils/api-error.js';
import { sendSuccess } from '../../utils/envelope.js';
import { getAuthenticatedUser, loginUser, registerUser } from './auth.service.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  // `validateBody` has already replaced req.body with the parsed, typed result.
  const result = await registerUser(req.body as RegisterInput);
  sendSuccess(res, result, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginUser(req.body as LoginInput);
  sendSuccess(res, result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required.', undefined, 'AUTH_REQUIRED');
  }

  const user = await getAuthenticatedUser(req.user.id);
  sendSuccess(res, { user });
});
