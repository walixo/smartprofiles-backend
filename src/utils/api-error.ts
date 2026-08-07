/** A single field-level validation failure, mirrored verbatim in the JSON error envelope. */
export interface FieldError {
  field: string;
  /** English fallback, shown when the client has no translation for `code`. */
  message: string;
  /**
   * Stable machine code for this specific field failure.
   *
   * Present only where the failure is a known business rule (a taken email, a
   * reserved handle). Schema-shape failures omit it: the client validates with
   * the same rules and produces its own localised text before ever calling.
   */
  code?: string;
}

/**
 * The only error type controllers and services are expected to throw.
 *
 * `code` is a stable, machine-readable identifier the client can translate.
 * `message` is the English fallback the client shows when it does not recognise
 * the code — which keeps the API authoritative while still allowing localisation.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: FieldError[] | undefined;

  constructor(status: number, message: string, code: string, errors?: FieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Bad request.', errors?: FieldError[], code = 'BAD_REQUEST'): ApiError {
    return new ApiError(400, message, code, errors);
  }

  static unauthorized(message = 'Authentication required.', errors?: FieldError[], code = 'UNAUTHORIZED'): ApiError {
    return new ApiError(401, message, code, errors);
  }

  static forbidden(message = 'You do not have access to this resource.', errors?: FieldError[], code = 'FORBIDDEN'): ApiError {
    return new ApiError(403, message, code, errors);
  }

  static notFound(message = 'Resource not found.', errors?: FieldError[], code = 'NOT_FOUND'): ApiError {
    return new ApiError(404, message, code, errors);
  }

  static conflict(message = 'That resource already exists.', errors?: FieldError[], code = 'CONFLICT'): ApiError {
    return new ApiError(409, message, code, errors);
  }

  static tooManyRequests(message = 'Too many requests. Please try again later.', code = 'RATE_LIMITED'): ApiError {
    return new ApiError(429, message, code);
  }

  static internal(message = 'Something went wrong on our end.', code = 'INTERNAL_ERROR'): ApiError {
    return new ApiError(500, message, code);
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}
