/**
 * Shared vocabulary — the closed sets of machine slugs the product is built on.
 *
 * Slugs are stable identifiers and are NEVER shown to a user. Every human-facing
 * label is resolved through i18n on the client (`discipline.music`, `country.BE`, …),
 * which is what lets the same profile render in seven languages without touching data.
 *
 * This file is mirrored verbatim at `frontend/src/shared/vocabulary.ts`.
 */

export const ROLES = ['freelancer', 'client', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/** Roles a visitor may choose during self-registration. `admin` is provisioned deliberately. */
export const SELF_SERVE_ROLES = ['freelancer', 'client'] as const;
export type SelfServeRole = (typeof SELF_SERVE_ROLES)[number];

export const USER_STATUSES = ['active', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** The seven SMART markets. */
export const COUNTRIES = ['BE', 'FR', 'DE', 'AT', 'SE', 'ES', 'IT'] as const;
export type CountryCode = (typeof COUNTRIES)[number];

/** The seven supported interface languages. English is the source of truth. */
export const LOCALES = ['en', 'fr', 'nl', 'de', 'sv', 'it', 'es'] as const;
export type LocaleCode = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: LocaleCode = 'en';

export const DISCIPLINES = [
  'performing-arts',
  'music',
  'audio-production',
  'film-video',
  'animation-motion',
  'photography',
  'graphic-design',
  'illustration',
  'visual-arts',
  'crafts',
  'writing-editing',
  'translation',
  'journalism',
  'web-development',
  'ux-ui-design',
  'marketing-communication',
  'event-production',
  'technical-crew',
  'teaching-training',
  'consulting',
] as const;
export type DisciplineSlug = (typeof DISCIPLINES)[number];

export const LANGUAGE_LEVELS = ['basic', 'conversational', 'fluent', 'native'] as const;
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];

export const AVAILABILITY_STATES = ['available', 'open-to-offers', 'unavailable'] as const;
export type AvailabilityState = (typeof AVAILABILITY_STATES)[number];

export const LINK_KINDS = ['website', 'portfolio', 'social', 'shop', 'other'] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const CURRENCIES = ['EUR', 'SEK'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const VISIBILITIES = ['draft', 'public', 'unlisted'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const WORK_VISIBILITIES = ['public', 'hidden'] as const;
export type WorkVisibility = (typeof WORK_VISIBILITIES)[number];

export const MEDIA_KINDS = ['image', 'embed'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const THREAD_STATUSES = ['open', 'archived'] as const;
export type ThreadStatus = (typeof THREAD_STATUSES)[number];

/**
 * Handles that would collide with application routes or impersonate the platform.
 * Enforced at the schema layer when a freelancer claims their unique link.
 */
export const RESERVED_HANDLES: readonly string[] = [
  'about',
  'admin',
  'api',
  'app',
  'auth',
  'browse',
  'chat',
  'contact',
  'dashboard',
  'help',
  'home',
  'legal',
  'login',
  'logout',
  'me',
  'messages',
  'new',
  'privacy',
  'profile',
  'profiles',
  'register',
  'root',
  'search',
  'settings',
  'signin',
  'signup',
  'smart',
  'support',
  'terms',
  'user',
  'users',
] as const;

/** Currency used for display when a profile has not chosen one, keyed by market. */
export const DEFAULT_CURRENCY_BY_COUNTRY: Record<CountryCode, Currency> = {
  BE: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  AT: 'EUR',
  SE: 'SEK',
  ES: 'EUR',
  IT: 'EUR',
};
