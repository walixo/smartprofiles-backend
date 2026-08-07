import { z } from 'zod';
import {
  AVAILABILITY_STATES,
  COUNTRIES,
  CURRENCIES,
  DISCIPLINES,
  LANGUAGE_LEVELS,
  LINK_KINDS,
  LOCALES,
  RESERVED_HANDLES,
  VISIBILITIES,
} from '../../shared/vocabulary.js';
import { paginationQuerySchema } from '../../utils/parse-query.js';

/** 3–30 chars, lowercase alphanumeric with inner hyphens only. */
const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Handles are at least 3 characters.')
  .max(30, 'Handles are at most 30 characters.')
  .regex(HANDLE_PATTERN, 'Use lowercase letters, numbers and hyphens. Hyphens cannot start or end it.')
  .refine((value) => !RESERVED_HANDLES.includes(value), 'That handle is reserved.');

const languageSchema = z.object({
  code: z.enum(LOCALES),
  level: z.enum(LANGUAGE_LEVELS),
});

const linkSchema = z.object({
  label: z.string().trim().min(1, 'Give the link a label.').max(40),
  url: z.url('Enter a valid URL, including https://').max(2048),
  kind: z.enum(LINK_KINDS),
});

const rateSchema = z
  .object({
    currency: z.enum(CURRENCIES),
    dayRateMin: z.number().int().min(0).max(100000).optional(),
    dayRateMax: z.number().int().min(0).max(100000).optional(),
    hourly: z.number().int().min(0).max(10000).optional(),
    visible: z.boolean().default(false),
  })
  .refine(
    (rate) => rate.dayRateMin === undefined || rate.dayRateMax === undefined || rate.dayRateMin <= rate.dayRateMax,
    { message: 'The minimum day rate cannot exceed the maximum.', path: ['dayRateMin'] },
  );

const contactSchema = z.object({
  // Loose on format deliberately: seven countries, and over-strict phone
  // validation rejects more legitimate numbers than it catches typos.
  phone: z.string().trim().min(6).max(32).optional().or(z.literal('')),
  showPhone: z.boolean().default(false),
  allowChat: z.boolean().default(true),
});

/** Fields shared by create and update. */
const profileFields = {
  headline: z.string().trim().min(4, 'Write at least a few words.').max(120),
  bio: z.string().trim().max(4000).optional().or(z.literal('')),
  disciplines: z
    .array(z.enum(DISCIPLINES))
    .min(1, 'Choose at least one discipline.')
    .max(5, 'Choose up to 5 disciplines.'),
  skills: z.array(z.string().trim().toLowerCase().min(1).max(40)).max(20, 'Up to 20 skills.'),
  country: z.enum(COUNTRIES),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  languages: z.array(languageSchema).max(7, 'Up to 7 languages.'),
  avatarUrl: z.url('Enter a valid image URL.').max(2048).optional().or(z.literal('')),
  coverUrl: z.url('Enter a valid image URL.').max(2048).optional().or(z.literal('')),
  links: z.array(linkSchema).max(8, 'Up to 8 links.'),
  rate: rateSchema.optional(),
  availability: z.enum(AVAILABILITY_STATES),
  contact: contactSchema,
};

export const createProfileSchema = z.object({
  handle: handleSchema,
  headline: profileFields.headline,
  disciplines: profileFields.disciplines,
  country: profileFields.country,
  // Everything else is optional at creation — a freelancer claims their link
  // first and fills the rest in the editor.
  bio: profileFields.bio,
  skills: profileFields.skills.default([]),
  city: profileFields.city,
  languages: profileFields.languages.default([]),
  avatarUrl: profileFields.avatarUrl,
  coverUrl: profileFields.coverUrl,
  links: profileFields.links.default([]),
  rate: profileFields.rate,
  availability: profileFields.availability.default('open-to-offers'),
  contact: profileFields.contact.default({ showPhone: false, allowChat: true }),
});

export const updateProfileSchema = z
  .object({
    handle: handleSchema,
    ...profileFields,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

export const setVisibilitySchema = z.object({
  visibility: z.enum(VISIBILITIES),
});

export const handleAvailabilityQuerySchema = z.object({
  handle: handleSchema,
});

export const browseProfilesQuerySchema = paginationQuerySchema.extend({
  country: z.enum(COUNTRIES).optional(),
  discipline: z.enum(DISCIPLINES).optional(),
  availability: z.enum(AVAILABILITY_STATES).optional(),
  q: z.string().trim().min(1).max(80).optional(),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SetVisibilityInput = z.infer<typeof setVisibilitySchema>;
export type BrowseProfilesQuery = z.infer<typeof browseProfilesQuerySchema>;
