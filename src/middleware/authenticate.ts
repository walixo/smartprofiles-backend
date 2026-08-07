import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error.js';
import { verifyAccessToken } from '../utils/jwt.js';

const BEARER_PREFIX = 'Bearer ';

/**
 * Requires a valid bearer token and attaches `{ id, role }` to the request.
 * Rejects with 401 when the header is missing, malformed, or the token fails
 * verification.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    next(ApiError.unauthorized('Authentication required.', undefined, 'AUTH_REQUIRED'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Attaches `req.user` when a valid token is present but never rejects.
 *
 * Used by endpoints whose response varies by viewer — a public profile hides a
 * freelancer's phone number from anonymous visitors but returns it to signed-in
 * users when `contact.showPhone` is set.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // A bad token on an optional route is treated as "not signed in".
  }

  next();
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;

  if (typeof header !== 'string' || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}
