import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error.js';

/** Terminal 404 for any request that matched no route. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Cannot ${req.method} ${req.path}`, undefined, 'ROUTE_NOT_FOUND'));
}
