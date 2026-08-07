import type { FieldError } from './api-error.js';

/**
 * Structurally typed so this helper is not coupled to a specific Zod minor
 * release's issue type export.
 */
interface IssueLike {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

/**
 * Flattens Zod issues into the `{ field, message }` pairs the error envelope
 * carries, using dot/bracket paths (`links.0.url`) so the client can map an
 * error straight onto a react-hook-form field name.
 */
export function zodIssuesToFieldErrors(issues: readonly IssueLike[]): FieldError[] {
  return issues.map((issue) => ({
    field: formatPath(issue.path),
    message: issue.message,
  }));
}

function formatPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return '_root';
  return path.map(String).join('.');
}
