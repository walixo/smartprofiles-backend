import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment contract. The process refuses to boot on an invalid environment
 * rather than failing later at the first request that needs a missing value.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4100),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  // Comma-separated so staging and production origins can share one deployment.
  CLIENT_ORIGIN: z.string().min(1).default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${details}\n\nCopy .env.example to .env and fill it in.`);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Browser origins permitted to call this API cross-origin.
 *
 * Validated at boot rather than per request: a typo here silently blocks every
 * browser request, which is far harder to diagnose at 2am than a refusal to
 * start. Never contains `*` — responses carry an `Authorization` header, so the
 * allowlist has to be explicit.
 */
export const allowedOrigins: readonly string[] = (() => {
  const origins = env.CLIENT_ORIGIN.split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const invalid = origins.filter((origin) => !URL.canParse(origin));

  if (origins.length === 0 || invalid.length > 0) {
    console.error(
      `Invalid CLIENT_ORIGIN. Expected a comma-separated list of absolute origins, e.g.\n` +
        `  CLIENT_ORIGIN=http://localhost:5173,https://smartprofiles.eu\n` +
        (invalid.length > 0 ? `Could not parse: ${invalid.join(', ')}` : 'It is empty.'),
    );
    process.exit(1);
  }

  // Normalise away trailing slashes and paths — the browser sends a bare origin.
  return origins.map((origin) => new URL(origin).origin);
})();
