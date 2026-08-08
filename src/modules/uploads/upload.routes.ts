import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { isProduction } from '../../config/env.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate-body.js';
import { ApiError } from '../../utils/api-error.js';
import { signUpload, uploadConfig } from './upload.controller.js';
import { signUploadSchema } from './upload.schema.js';

/**
 * Signatures are cheap to mint but each one authorises a write to the
 * Cloudinary account, so they get their own tighter budget than the global API
 * limit — enough for a full profile of images, not enough to farm.
 */
const signatureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 60 : 500,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many uploads. Please wait a few minutes.'));
  },
});

export const uploadRouter: Router = Router();

// Public: the UI needs to know whether to render the control at all.
uploadRouter.get('/config', uploadConfig);

uploadRouter.post(
  '/signature',
  authenticate,
  authorize('freelancer', 'admin'),
  signatureLimiter,
  validateBody(signUploadSchema),
  signUpload,
);
