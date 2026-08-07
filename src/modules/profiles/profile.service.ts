import { Types } from 'mongoose';
import type { Visibility } from '../../shared/vocabulary.js';
import { ApiError } from '../../utils/api-error.js';
import { buildPageMeta, toSkip, type PageMeta } from '../../utils/parse-query.js';
import { User } from '../users/user.model.js';
import { toPublicWork } from '../works/work.dto.js';
import { Work } from '../works/work.model.js';
import {
  toOwnerProfile,
  toProfileSummary,
  toPublicProfile,
  type OwnerProfile,
  type ProfileSummary,
  type PublicProfile,
  type Viewer,
} from './profile.dto.js';
import { Profile, type ProfileDocument } from './profile.model.js';
import type { BrowseProfilesQuery, CreateProfileInput, UpdateProfileInput } from './profile.schema.js';

export async function isHandleAvailable(handle: string, excludeProfileId?: string): Promise<boolean> {
  const existing = await Profile.findOne({ handle }).select('_id');
  if (!existing) return true;
  return excludeProfileId !== undefined && String(existing.id) === excludeProfileId;
}

export async function createProfile(userId: string, input: CreateProfileInput): Promise<OwnerProfile> {
  const existing = await Profile.findOne({ user: userId }).select('_id');

  if (existing) {
    throw ApiError.conflict('You already have a profile.', undefined, 'PROFILE_EXISTS');
  }

  if (!(await isHandleAvailable(input.handle))) {
    throw handleTakenError();
  }

  const { set } = splitUpdate(input);

  const profile = await Profile.create({
    ...set,
    user: new Types.ObjectId(userId),
    visibility: 'draft',
    viewCount: 0,
  });

  return toOwnerProfile(profile, await displayNameOf(userId));
}

export async function getOwnProfile(userId: string): Promise<OwnerProfile> {
  const profile = await requireOwnProfile(userId);
  return toOwnerProfile(profile, await displayNameOf(userId));
}

export async function updateOwnProfile(userId: string, input: UpdateProfileInput): Promise<OwnerProfile> {
  const profile = await requireOwnProfile(userId);

  if (input.handle !== undefined && input.handle !== profile.handle) {
    if (!(await isHandleAvailable(input.handle, String(profile.id)))) {
      throw handleTakenError();
    }
  }

  const { set, unset } = splitUpdate(input);

  profile.set(set);
  for (const path of unset) {
    profile.set(path, undefined);
  }

  await profile.save();

  return toOwnerProfile(profile, await displayNameOf(userId));
}

export async function setProfileVisibility(userId: string, visibility: Visibility): Promise<OwnerProfile> {
  const profile = await requireOwnProfile(userId);

  if (visibility !== 'draft' && !isPublishable(profile)) {
    throw ApiError.badRequest(
      'Add a headline, at least one discipline and a country before publishing.',
      undefined,
      'PROFILE_INCOMPLETE',
    );
  }

  profile.visibility = visibility;
  // Records the first time it went live; re-publishing later does not reset it.
  if (visibility === 'public' && !profile.publishedAt) {
    profile.publishedAt = new Date();
  }

  await profile.save();

  return toOwnerProfile(profile, await displayNameOf(userId));
}

export async function getProfileByHandle(handle: string, viewer: Viewer | undefined): Promise<PublicProfile> {
  const profile = await Profile.findOne({ handle });

  // A draft is a 404 to everyone but its owner — "exists but hidden" would
  // leak which handles are taken.
  const isOwner = viewer !== undefined && String(profile?.user) === viewer.id;

  if (!profile || (profile.visibility === 'draft' && !isOwner)) {
    throw ApiError.notFound('We could not find that profile.', undefined, 'PROFILE_NOT_FOUND');
  }

  const works = await Work.find({ profile: profile.id, visibility: 'public' }).sort({ order: 1, createdAt: 1 });

  if (!isOwner) {
    // Owners looking at their own page should not inflate their view count.
    await Profile.updateOne({ _id: profile.id }, { $inc: { viewCount: 1 } });
  }

  return toPublicProfile(profile, await displayNameOf(String(profile.user)), works.map(toPublicWork), viewer);
}

export async function browseProfiles(
  query: BrowseProfilesQuery,
): Promise<{ items: ProfileSummary[]; meta: PageMeta }> {
  const filter: Record<string, unknown> = { visibility: 'public' };

  if (query.country) filter.country = query.country;
  if (query.discipline) filter.disciplines = query.discipline;
  if (query.availability) filter.availability = query.availability;
  if (query.q) filter.$text = { $search: query.q };

  const [profiles, total] = await Promise.all([
    Profile.find(filter).sort({ publishedAt: -1, _id: -1 }).skip(toSkip(query)).limit(query.limit),
    Profile.countDocuments(filter),
  ]);

  // Two batched lookups instead of a query per row.
  const [names, workCounts] = await Promise.all([
    displayNamesOf(profiles.map((p) => String(p.user))),
    publicWorkCountsFor(profiles.map((p) => String(p.id))),
  ]);

  const items = profiles.map((profile) =>
    toProfileSummary(
      profile,
      names.get(String(profile.user)) ?? 'Unknown',
      workCounts.get(String(profile.id)) ?? 0,
    ),
  );

  return { items, meta: buildPageMeta(query, total) };
}

async function requireOwnProfile(userId: string): Promise<ProfileDocument> {
  const profile = await Profile.findOne({ user: userId });

  if (!profile) {
    throw ApiError.notFound('You have not created a profile yet.', undefined, 'PROFILE_NOT_FOUND');
  }

  return profile;
}

/** Exported so the works module can resolve and authorise the caller's profile. */
export { requireOwnProfile };

function isPublishable(profile: ProfileDocument): boolean {
  return profile.headline.trim().length > 0 && profile.disciplines.length > 0 && Boolean(profile.country);
}

function handleTakenError(): ApiError {
  return ApiError.conflict(
    'That handle is already taken.',
    [{ field: 'handle', message: 'This handle is already taken.', code: 'HANDLE_TAKEN' }],
    'HANDLE_TAKEN',
  );
}

/**
 * Splits a validated patch into fields to set and paths to clear.
 *
 * The schemas accept `''` as "clear this", because an HTML input cannot submit
 * `undefined`. Mongoose ignores `undefined` in a `set()`, so those keys have to
 * be unset explicitly or clearing a bio would silently do nothing.
 */
function splitUpdate(input: Record<string, unknown>): { set: Record<string, unknown>; unset: string[] } {
  const set: Record<string, unknown> = {};
  const unset: string[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;

    if (value === '') {
      unset.push(key);
      continue;
    }

    if (key === 'contact' || key === 'rate') {
      set[key] = dropEmptyStrings(value as Record<string, unknown>);
      continue;
    }

    set[key] = value;
  }

  return { set, unset };
}

function dropEmptyStrings(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== '' && v !== undefined));
}

async function displayNameOf(userId: string): Promise<string> {
  const user = await User.findById(userId).select('displayName');
  return user?.displayName ?? 'Unknown';
}

async function displayNamesOf(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const users = await User.find({ _id: { $in: userIds } }).select('displayName');
  return new Map(users.map((user) => [String(user.id), user.displayName]));
}

async function publicWorkCountsFor(profileIds: string[]): Promise<Map<string, number>> {
  if (profileIds.length === 0) return new Map();

  const rows = await Work.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { profile: { $in: profileIds.map((id) => new Types.ObjectId(id)) }, visibility: 'public' } },
    { $group: { _id: '$profile', count: { $sum: 1 } } },
  ]);

  return new Map(rows.map((row) => [String(row._id), row.count]));
}
