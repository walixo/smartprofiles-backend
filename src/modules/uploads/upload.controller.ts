import type { Request, Response } from 'express';
import { isUploadsEnabled } from '../../config/env.js';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess } from '../../utils/envelope.js';
import type { SignUploadInput } from './upload.schema.js';
import { createUploadSignature, MAX_UPLOAD_BYTES } from './upload.service.js';

/** Lets the UI hide the upload control instead of offering one that will fail. */
export const uploadConfig = asyncHandler((_req: Request, res: Response) => {
  sendSuccess(res, { enabled: isUploadsEnabled, maxBytes: MAX_UPLOAD_BYTES });
});

export const signUpload = asyncHandler((req: Request, res: Response) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required.', undefined, 'AUTH_REQUIRED');
  }

  const { kind } = req.body as SignUploadInput;
  sendSuccess(res, createUploadSignature(req.user.id, kind));
});
