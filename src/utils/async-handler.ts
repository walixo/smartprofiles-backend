import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

/**
 * Forwards rejected promises to the error middleware.
 *
 * Express 5 already forwards async rejections, but wrapping explicitly keeps the
 * contract obvious at every call site and stays correct if a handler is ever
 * mounted somewhere that does not have that behaviour.
 */
export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
