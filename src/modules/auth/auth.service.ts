import { DEFAULT_LOCALE } from '../../shared/vocabulary.js';
import { ApiError } from '../../utils/api-error.js';
import { signAccessToken } from '../../utils/jwt.js';
import { toPublicUser, type PublicUser } from '../users/user.dto.js';
import { User } from '../users/user.model.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await User.exists({ email: input.email });

  if (existing) {
    throw ApiError.conflict(
      'An account with that email already exists.',
      [{ field: 'email', message: 'This email is already registered.', code: 'EMAIL_TAKEN' }],
      'EMAIL_TAKEN',
    );
  }

  const passwordHash = await User.hashPassword(input.password);

  const user = await User.create({
    displayName: input.displayName,
    email: input.email,
    passwordHash,
    role: input.role,
    locale: input.locale ?? DEFAULT_LOCALE,
    status: 'active',
  });

  return { user: toPublicUser(user), token: issueToken(user.id as string, user.role) };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');

  // Same error whether the email is unknown or the password is wrong, so the
  // endpoint cannot be used to discover which addresses have accounts.
  if (!user || !(await user.comparePassword(input.password))) {
    throw ApiError.unauthorized(
      'That email and password do not match.',
      undefined,
      'INVALID_CREDENTIALS',
    );
  }

  if (user.status === 'suspended') {
    throw ApiError.forbidden(
      'This account has been suspended. Contact support for help.',
      undefined,
      'ACCOUNT_SUSPENDED',
    );
  }

  user.lastLoginAt = new Date();
  await user.save();

  return { user: toPublicUser(user), token: issueToken(user.id as string, user.role) };
}

/**
 * Resolves the signed-in user from a verified token. A token can outlive the
 * account it names, so the record is re-checked on every call rather than
 * trusting the claims alone.
 */
export async function getAuthenticatedUser(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);

  if (!user) {
    throw ApiError.unauthorized('Your account could not be found.', undefined, 'ACCOUNT_NOT_FOUND');
  }

  if (user.status === 'suspended') {
    throw ApiError.forbidden(
      'This account has been suspended. Contact support for help.',
      undefined,
      'ACCOUNT_SUSPENDED',
    );
  }

  return toPublicUser(user);
}

function issueToken(userId: string, role: PublicUser['role']): string {
  return signAccessToken({ sub: userId, role });
}
