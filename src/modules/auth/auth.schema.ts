import { z } from 'zod';
import { LOCALES, SELF_SERVE_ROLES } from '../../shared/vocabulary.js';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/** At least one letter and one digit — enforced identically on the client. */
const PASSWORD_COMPLEXITY = /^(?=.*[A-Za-z])(?=.*\d).+$/;

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, 'That password is too long.')
  .regex(PASSWORD_COMPLEXITY, 'Include at least one letter and one number.');

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters.')
    .max(60, 'Keep this under 60 characters.'),
  email: z.email('Enter a valid email address.').max(254).trim().toLowerCase(),
  password: passwordSchema,
  // `admin` is deliberately excluded — admins are provisioned with the CLI script.
  role: z.enum(SELF_SERVE_ROLES, { message: 'Choose how you will use Smart Profiles.' }),
  locale: z.enum(LOCALES).optional(),
});

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.').max(254).trim().toLowerCase(),
  // Deliberately not the full policy: an existing password must still work if
  // the rules are tightened later.
  password: z.string().min(1, 'Enter your password.').max(PASSWORD_MAX_LENGTH),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
