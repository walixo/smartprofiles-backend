import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ROLES, type Role } from '../shared/vocabulary.js';
import { ApiError } from './api-error.js';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: 'smart-profiles',
  };
  return jwt.sign({ role: payload.role }, env.JWT_SECRET, { ...options, subject: payload.sub });
}

/**
 * Verifies a token and narrows the decoded claims. Any failure — expiry, bad
 * signature, malformed claims — surfaces as a 401 so callers never have to
 * distinguish jsonwebtoken's error classes.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  let decoded: unknown;

  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { issuer: 'smart-profiles' });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Your session has expired. Please sign in again.', undefined, 'TOKEN_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid authentication token.', undefined, 'TOKEN_INVALID');
  }

  if (typeof decoded !== 'object' || decoded === null) {
    throw ApiError.unauthorized('Invalid authentication token.', undefined, 'TOKEN_INVALID');
  }

  const { sub, role } = decoded as Record<string, unknown>;

  if (typeof sub !== 'string' || !isRole(role)) {
    throw ApiError.unauthorized('Invalid authentication token.', undefined, 'TOKEN_INVALID');
  }

  return { sub, role };
}

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}
