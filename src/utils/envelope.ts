import type { Response } from 'express';
import type { FieldError } from './api-error.js';

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

export interface ErrorEnvelope {
  success: false;
  message: string;
  code: string;
  errors?: FieldError[];
}

/** Every successful response goes through here so the envelope shape is enforced in one place. */
export function sendSuccess<T>(res: Response, data: T, status = 200): Response {
  const body: SuccessEnvelope<T> = { success: true, data };
  return res.status(status).json(body);
}

export function sendError(
  res: Response,
  status: number,
  message: string,
  code: string,
  errors?: FieldError[],
): Response {
  const body: ErrorEnvelope = errors && errors.length > 0
    ? { success: false, message, code, errors }
    : { success: false, message, code };
  return res.status(status).json(body);
}
