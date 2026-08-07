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
  CLIENT_ORIGIN: z.url().default('http://localhost:5173'),
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
