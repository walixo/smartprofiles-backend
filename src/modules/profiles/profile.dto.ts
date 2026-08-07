import type {
  AvailabilityState,
  CountryCode,
  Currency,
  DisciplineSlug,
  LanguageLevel,
  LinkKind,
  LocaleCode,
  Visibility,
} from '../../shared/vocabulary.js';
import type { PublicWork } from '../works/work.dto.js';
import type { ProfileDocument } from './profile.model.js';

export interface PublicProfileContact {
  /**
   * Present ONLY when the viewer is authenticated and the owner enabled
   * `showPhone`. Anonymous visitors never receive the number in any form —
   * this is the anti-scraping rule, enforced here rather than in the UI.
   */
  phone?: string;
  /** Always sent, so the UI can offer "sign in to view" without leaking the value. */
  phoneAvailable: boolean;
  allowChat: boolean;
}

export interface PublicProfileRate {
  currency: Currency;
  dayRateMin?: number;
  dayRateMax?: number;
  hourly?: number;
}

export interface PublicProfile {
  id: string;
  handle: string;
  displayName: string;
  headline: string;
  bio?: string;
  disciplines: DisciplineSlug[];
  skills: string[];
  country: CountryCode;
  city?: string;
  languages: Array<{ code: LocaleCode; level: LanguageLevel }>;
  avatarUrl?: string;
  coverUrl?: string;
  links: Array<{ label: string; url: string; kind: LinkKind }>;
  rate?: PublicProfileRate;
  availability: AvailabilityState;
  contact: PublicProfileContact;
  publishedAt?: string;
  works: PublicWork[];
}

/** Everything the owner needs in the editor, including what the public never sees. */
export interface OwnerProfile extends Omit<PublicProfile, 'contact' | 'works'> {
  contact: { phone?: string; showPhone: boolean; allowChat: boolean };
  rate?: PublicProfileRate & { visible: boolean };
  visibility: Visibility;
  viewCount: number;
  updatedAt: string;
}

export interface Viewer {
  id: string;
  role: string;
}

export function toPublicProfile(
  profile: ProfileDocument,
  displayName: string,
  works: PublicWork[],
  viewer: Viewer | undefined,
): PublicProfile {
  const canSeePhone = viewer !== undefined && profile.contact.showPhone && Boolean(profile.contact.phone);

  return {
    id: String(profile.id),
    handle: profile.handle,
    displayName,
    headline: profile.headline,
    ...optional('bio', profile.bio),
    disciplines: profile.disciplines,
    skills: profile.skills,
    country: profile.country,
    ...optional('city', profile.city),
    languages: profile.languages.map((l) => ({ code: l.code, level: l.level })),
    ...optional('avatarUrl', profile.avatarUrl),
    ...optional('coverUrl', profile.coverUrl),
    links: profile.links.map((l) => ({ label: l.label, url: l.url, kind: l.kind })),
    // A rate the owner marked private is dropped entirely, not zeroed.
    ...(profile.rate && profile.rate.visible ? { rate: stripRate(profile.rate) } : {}),
    availability: profile.availability,
    contact: {
      ...(canSeePhone ? { phone: profile.contact.phone } : {}),
      phoneAvailable: profile.contact.showPhone && Boolean(profile.contact.phone),
      allowChat: profile.contact.allowChat,
    },
    ...optional('publishedAt', profile.publishedAt?.toISOString()),
    works,
  };
}

export function toOwnerProfile(profile: ProfileDocument, displayName: string): OwnerProfile {
  return {
    id: String(profile.id),
    handle: profile.handle,
    displayName,
    headline: profile.headline,
    ...optional('bio', profile.bio),
    disciplines: profile.disciplines,
    skills: profile.skills,
    country: profile.country,
    ...optional('city', profile.city),
    languages: profile.languages.map((l) => ({ code: l.code, level: l.level })),
    ...optional('avatarUrl', profile.avatarUrl),
    ...optional('coverUrl', profile.coverUrl),
    links: profile.links.map((l) => ({ label: l.label, url: l.url, kind: l.kind })),
    ...(profile.rate ? { rate: { ...stripRate(profile.rate), visible: profile.rate.visible } } : {}),
    availability: profile.availability,
    contact: {
      ...optional('phone', profile.contact.phone),
      showPhone: profile.contact.showPhone,
      allowChat: profile.contact.allowChat,
    },
    visibility: profile.visibility,
    viewCount: profile.viewCount,
    ...optional('publishedAt', profile.publishedAt?.toISOString()),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

/** Summary shape for the browse list — never carries contact details. */
export interface ProfileSummary {
  id: string;
  handle: string;
  displayName: string;
  headline: string;
  disciplines: DisciplineSlug[];
  country: CountryCode;
  city?: string;
  avatarUrl?: string;
  availability: AvailabilityState;
  workCount: number;
}

export function toProfileSummary(
  profile: ProfileDocument,
  displayName: string,
  workCount: number,
): ProfileSummary {
  return {
    id: String(profile.id),
    handle: profile.handle,
    displayName,
    headline: profile.headline,
    disciplines: profile.disciplines,
    country: profile.country,
    ...optional('city', profile.city),
    ...optional('avatarUrl', profile.avatarUrl),
    availability: profile.availability,
    workCount,
  };
}

function stripRate(rate: NonNullable<ProfileDocument['rate']>): PublicProfileRate {
  return {
    currency: rate.currency,
    ...optional('dayRateMin', rate.dayRateMin),
    ...optional('dayRateMax', rate.dayRateMax),
    ...optional('hourly', rate.hourly),
  };
}

/** Omits the key entirely rather than emitting `undefined` into JSON. */
function optional<K extends string, V>(key: K, value: V | undefined | null | ''): Record<K, V> | Record<string, never> {
  return value === undefined || value === null || value === '' ? {} : ({ [key]: value } as Record<K, V>);
}
