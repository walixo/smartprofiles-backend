import type { NextFunction, Request, Response } from 'express';
import { allowedOrigins } from '../config/env.js';

const ALLOWED_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Authorization, Content-Type';
/** Cache preflight results for 10 minutes so they are not re-sent per request. */
const PREFLIGHT_MAX_AGE = '600';

/**
 * Hand-rolled CORS, allowlist only.
 *
 * Written rather than pulled from `cors` because the stack forbids new
 * dependencies. The rules it enforces:
 *
 *  - The reflected origin is only ever one that appears in `CLIENT_ORIGIN`.
 *    `*` is never sent: requests carry a bearer token, and a wildcard would let
 *    any site on the internet read authenticated responses.
 *  - `Vary: Origin` is set on every cross-origin response, allowed or not.
 *    Without it a shared cache can hand one origin's response to another and
 *    quietly defeat the allowlist.
 *  - Requests with no `Origin` header pass straight through. Same-origin calls,
 *    curl and server-to-server traffic are not the browser's business.
 *  - A disallowed origin is not an error response. The request proceeds and the
 *    browser blocks the read, which is exactly what CORS is specified to do —
 *    returning 403 here would leak which origins are configured.
 */
export function cors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  if (typeof origin !== 'string' || origin.length === 0) {
    next();
    return;
  }

  res.setHeader('Vary', 'Origin');

  // A bare OPTIONS without this header is not a preflight — let it route normally.
  const isPreflight =
    req.method === 'OPTIONS' && typeof req.headers['access-control-request-method'] === 'string';

  if (!allowedOrigins.includes(origin)) {
    if (isPreflight) {
      // Answer the preflight without granting permission; the browser stops here.
      res.status(204).end();
      return;
    }
    next();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  // Lets the client read its remaining quota instead of guessing at a 429.
  res.setHeader('Access-Control-Expose-Headers', 'RateLimit, RateLimit-Policy');

  if (isPreflight) {
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader('Access-Control-Max-Age', PREFLIGHT_MAX_AGE);
    res.status(204).end();
    return;
  }

  next();
}
