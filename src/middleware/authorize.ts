import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '../shared/vocabulary.js';
import { ApiError } from '../utils/api-error.js';

/**
 * Restricts a route to the given roles. Must run after `authenticate`; an
 * unauthenticated request is a 401 rather than a 403 so the client knows to
 * send the user to sign in instead of showing "access denied".
 */
export function authorize(...roles: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required.', undefined, 'AUTH_REQUIRED'));
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      next(ApiError.forbidden('You do not have access to this resource.', undefined, 'ROLE_FORBIDDEN'));
      return;
    }

    next();
  };
}
