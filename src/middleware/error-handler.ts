import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { isProduction } from '../config/env.js';
import { ApiError, isApiError, type FieldError } from '../utils/api-error.js';
import { sendError } from '../utils/envelope.js';

/**
 * Single exit point for every failure. Translates the error types this app can
 * realistically produce into the JSON error envelope, and refuses to leak
 * internal detail in production.
 */
export function errorHandler(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const normalised = normaliseError(error);

  if (normalised.status >= 500) {
    console.error('Unhandled error:', error);
  }

  sendError(res, normalised.status, normalised.message, normalised.code, normalised.errors);
}

function normaliseError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const errors: FieldError[] = Object.entries(error.errors).map(([field, detail]) => ({
      field,
      message: detail.message,
    }));
    return ApiError.badRequest('Please correct the highlighted fields.', errors, 'VALIDATION_FAILED');
  }

  if (error instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(
      `Invalid value for "${error.path}".`,
      [{ field: error.path, message: 'This value is not in a valid format.' }],
      'INVALID_IDENTIFIER',
    );
  }

  if (isDuplicateKeyError(error)) {
    const field = Object.keys(error.keyPattern)[0] ?? '_root';
    return ApiError.conflict(
      'That value is already taken.',
      [{ field, message: 'This value is already in use.' }],
      'DUPLICATE_KEY',
    );
  }

  if (isJsonSyntaxError(error)) {
    return ApiError.badRequest('The request body is not valid JSON.', undefined, 'INVALID_JSON');
  }

  if (isProduction || !(error instanceof Error)) {
    return ApiError.internal();
  }

  return ApiError.internal(error.message);
}

interface DuplicateKeyError {
  code: number;
  keyPattern: Record<string, unknown>;
}

function isDuplicateKeyError(error: unknown): error is DuplicateKeyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 11000 &&
    typeof (error as { keyPattern?: unknown }).keyPattern === 'object' &&
    (error as { keyPattern?: unknown }).keyPattern !== null
  );
}

function isJsonSyntaxError(error: unknown): boolean {
  return error instanceof SyntaxError && 'body' in error;
}
