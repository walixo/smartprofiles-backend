import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../utils/api-error.js';
import { zodIssuesToFieldErrors } from '../utils/zod-errors.js';

/**
 * Replaces `req.body` with the parsed result, so downstream handlers receive
 * coerced, stripped, fully typed data — never the raw client payload.
 */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(
        ApiError.badRequest(
          'Please correct the highlighted fields.',
          zodIssuesToFieldErrors(result.error.issues),
          'VALIDATION_FAILED',
        ),
      );
      return;
    }

    req.body = result.data;
    next();
  };
}
