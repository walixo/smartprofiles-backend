import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose';
import {
  AVAILABILITY_STATES,
  COUNTRIES,
  CURRENCIES,
  DISCIPLINES,
  LANGUAGE_LEVELS,
  LINK_KINDS,
  LOCALES,
  VISIBILITIES,
  type AvailabilityState,
  type CountryCode,
  type Currency,
  type DisciplineSlug,
  type LanguageLevel,
  type LinkKind,
  type LocaleCode,
  type Visibility,
} from '../../shared/vocabulary.js';

export interface ProfileLanguage {
  code: LocaleCode;
  level: LanguageLevel;
}

export interface ProfileLink {
  label: string;
  url: string;
  kind: LinkKind;
}

export interface ProfileRate {
  currency: Currency;
  dayRateMin?: number;
  dayRateMax?: number;
  hourly?: number;
  /** When false the rate is stored but never leaves the API on a public read. */
  visible: boolean;
}

export interface ProfileContact {
  phone?: string;
  /** Even when true, the number is only released to authenticated viewers. */
  showPhone: boolean;
  allowChat: boolean;
}

export interface ProfileAttrs {
  user: Types.ObjectId;
  handle: string;
  headline: string;
  bio?: string;
  disciplines: DisciplineSlug[];
  skills: string[];
  country: CountryCode;
  city?: string;
  languages: ProfileLanguage[];
  avatarUrl?: string;
  coverUrl?: string;
  links: ProfileLink[];
  rate?: ProfileRate;
  availability: AvailabilityState;
  contact: ProfileContact;
  visibility: Visibility;
  publishedAt?: Date;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ProfileDocument = HydratedDocument<ProfileAttrs>;
export type ProfileModelType = Model<ProfileAttrs>;

const languageSchema = new Schema<ProfileLanguage>(
  {
    code: { type: String, required: true, enum: LOCALES },
    level: { type: String, required: true, enum: LANGUAGE_LEVELS },
  },
  { _id: false },
);

const linkSchema = new Schema<ProfileLink>(
  {
    label: { type: String, required: true, trim: true, maxlength: 40 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    kind: { type: String, required: true, enum: LINK_KINDS },
  },
  { _id: false },
);

const rateSchema = new Schema<ProfileRate>(
  {
    currency: { type: String, required: true, enum: CURRENCIES },
    dayRateMin: { type: Number, min: 0, max: 100000 },
    dayRateMax: { type: Number, min: 0, max: 100000 },
    hourly: { type: Number, min: 0, max: 10000 },
    visible: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const contactSchema = new Schema<ProfileContact>(
  {
    phone: { type: String, trim: true, maxlength: 32 },
    showPhone: { type: Boolean, required: true, default: false },
    allowChat: { type: Boolean, required: true, default: true },
  },
  { _id: false },
);

const profileSchema = new Schema<ProfileAttrs, ProfileModelType>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, immutable: true },
    handle: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 30 },
    headline: { type: String, required: true, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 4000 },
    disciplines: {
      type: [{ type: String, enum: DISCIPLINES }],
      required: true,
      validate: {
        validator: (value: string[]) => value.length >= 1 && value.length <= 5,
        message: 'Choose between 1 and 5 disciplines.',
      },
    },
    skills: {
      type: [{ type: String, trim: true, maxlength: 40 }],
      default: [],
      validate: { validator: (v: string[]) => v.length <= 20, message: 'Up to 20 skills.' },
    },
    country: { type: String, required: true, enum: COUNTRIES },
    city: { type: String, trim: true, maxlength: 80 },
    languages: {
      type: [languageSchema],
      default: [],
      validate: { validator: (v: unknown[]) => v.length <= 7, message: 'Up to 7 languages.' },
    },
    avatarUrl: { type: String, trim: true, maxlength: 2048 },
    coverUrl: { type: String, trim: true, maxlength: 2048 },
    links: {
      type: [linkSchema],
      default: [],
      validate: { validator: (v: unknown[]) => v.length <= 8, message: 'Up to 8 links.' },
    },
    rate: { type: rateSchema },
    availability: { type: String, required: true, enum: AVAILABILITY_STATES, default: 'open-to-offers' },
    contact: { type: contactSchema, required: true, default: () => ({ showPhone: false, allowChat: true }) },
    visibility: { type: String, required: true, enum: VISIBILITIES, default: 'draft' },
    publishedAt: { type: Date },
    viewCount: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

// Browse: public profiles filtered by market and discipline.
profileSchema.index({ visibility: 1, country: 1, disciplines: 1 });
// Free-text search across the two fields a client actually scans.
profileSchema.index({ headline: 'text', skills: 'text' });

export const Profile = model<ProfileAttrs, ProfileModelType>('Profile', profileSchema);
