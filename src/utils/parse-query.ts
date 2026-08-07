import { z, type ZodType } from 'zod';
import { ApiError } from './api-error.js';
import { zodIssuesToFieldErrors } from './zod-errors.js';

/**
 * Validates and coerces `req.query` (always strings) into a typed object,
 * raising a 400 with field errors when the query string is malformed.
 */
export function parseQuery<T>(schema: ZodType<T>, query: unknown): T {
  const result = schema.safeParse(query);

  if (!result.success) {
    throw ApiError.badRequest(
      'Invalid query parameters.',
      zodIssuesToFieldErrors(result.error.issues),
      'INVALID_QUERY',
    );
  }

  return result.data;
}

export const MAX_PAGE_SIZE = 60;

/** Reusable pagination shape; feature schemas extend this rather than redefining it. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function buildPageMeta(pagination: PaginationQuery, total: number): PageMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.limit);
  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages,
    hasMore: pagination.page < totalPages,
  };
}

export function toSkip(pagination: PaginationQuery): number {
  return (pagination.page - 1) * pagination.limit;
}
