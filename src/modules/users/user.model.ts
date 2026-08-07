import bcrypt from 'bcryptjs';
import { model, Schema, type HydratedDocument, type Model } from 'mongoose';
import {
  DEFAULT_LOCALE,
  LOCALES,
  ROLES,
  USER_STATUSES,
  type LocaleCode,
  type Role,
  type UserStatus,
} from '../../shared/vocabulary.js';

const BCRYPT_ROUNDS = 12;

export interface UserAttrs {
  email: string;
  passwordHash: string;
  role: Role;
  displayName: string;
  status: UserStatus;
  locale: LocaleCode;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

export interface UserModelType extends Model<UserAttrs, Record<string, never>, UserMethods> {
  hashPassword(plain: string): Promise<string>;
}

export type UserDocument = HydratedDocument<UserAttrs, UserMethods>;

const userSchema = new Schema<UserAttrs, UserModelType, UserMethods>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // Never returned by default — a query must opt in with `.select('+passwordHash')`.
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ROLES,
      // Changing a role would silently change what a session can do; role
      // changes must go through a deliberate admin action, not a profile update.
      immutable: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    status: {
      type: String,
      required: true,
      enum: USER_STATUSES,
      default: 'active',
    },
    locale: {
      type: String,
      required: true,
      enum: LOCALES,
      default: DEFAULT_LOCALE,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

userSchema.statics.hashPassword = function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
};

userSchema.methods.comparePassword = function comparePassword(candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = model<UserAttrs, UserModelType>('User', userSchema);
