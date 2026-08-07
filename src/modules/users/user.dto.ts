import type { LocaleCode, Role, UserStatus } from '../../shared/vocabulary.js';
import type { UserDocument } from './user.model.js';

/**
 * The only user shape that ever leaves the API.
 *
 * Services return this rather than a Mongoose document, so a field added to the
 * schema cannot leak into a response by accident — it has to be added here too.
 */
export interface PublicUser {
  id: string;
  email: string;
  role: Role;
  displayName: string;
  status: UserStatus;
  locale: LocaleCode;
  createdAt: string;
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user.id as string,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    status: user.status,
    locale: user.locale,
    createdAt: user.createdAt.toISOString(),
  };
}
