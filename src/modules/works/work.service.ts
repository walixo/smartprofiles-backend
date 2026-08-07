import { Types } from 'mongoose';
import { ApiError } from '../../utils/api-error.js';
import { requireOwnProfile } from '../profiles/profile.service.js';
import { toOwnerWork, type OwnerWork } from './work.dto.js';
import { Work, type WorkDocument } from './work.model.js';
import type { CreateWorkInput, UpdateWorkInput } from './work.schema.js';

const MAX_WORKS_PER_PROFILE = 60;

export async function listOwnWorks(userId: string): Promise<OwnerWork[]> {
  const profile = await requireOwnProfile(userId);
  const works = await Work.find({ profile: profile.id }).sort({ order: 1, createdAt: 1 });
  return works.map(toOwnerWork);
}

export async function createWork(userId: string, input: CreateWorkInput): Promise<OwnerWork> {
  const profile = await requireOwnProfile(userId);

  const count = await Work.countDocuments({ profile: profile.id });
  if (count >= MAX_WORKS_PER_PROFILE) {
    throw ApiError.badRequest(
      `A profile can hold up to ${MAX_WORKS_PER_PROFILE} works.`,
      undefined,
      'WORK_LIMIT_REACHED',
    );
  }

  // New works land at the end of the existing order.
  const last = await Work.findOne({ profile: profile.id }).sort({ order: -1 }).select('order');

  const work = await Work.create({
    ...dropEmptyStrings(input),
    profile: profile.id,
    order: (last?.order ?? -1) + 1,
  });

  return toOwnerWork(work);
}

export async function updateWork(userId: string, workId: string, input: UpdateWorkInput): Promise<OwnerWork> {
  const work = await requireOwnWork(userId, workId);

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    // `''` means "clear this" — Mongoose ignores `undefined` in a set().
    work.set(key, value === '' ? undefined : value);
  }

  await work.save();

  return toOwnerWork(work);
}

export async function deleteWork(userId: string, workId: string): Promise<void> {
  const work = await requireOwnWork(userId, workId);
  await work.deleteOne();
}

export async function reorderWorks(userId: string, orderedIds: string[]): Promise<OwnerWork[]> {
  const profile = await requireOwnProfile(userId);
  const works = await Work.find({ profile: profile.id }).select('_id');

  const owned = new Set(works.map((work) => String(work.id)));
  const requested = new Set(orderedIds);

  // Reject a partial or foreign list outright rather than silently reordering
  // a subset and leaving the rest at stale positions.
  if (requested.size !== orderedIds.length) {
    throw ApiError.badRequest('The order contains duplicate ids.', undefined, 'REORDER_DUPLICATE');
  }

  if (owned.size !== requested.size || orderedIds.some((id) => !owned.has(id))) {
    throw ApiError.badRequest(
      'The order must list every work on your profile exactly once.',
      undefined,
      'REORDER_MISMATCH',
    );
  }

  await Work.bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: { filter: { _id: new Types.ObjectId(id), profile: profile.id }, update: { $set: { order: index } } },
    })),
  );

  const updated = await Work.find({ profile: profile.id }).sort({ order: 1, createdAt: 1 });
  return updated.map(toOwnerWork);
}

/**
 * Resolves a work and proves the caller owns it.
 *
 * Scoped by the caller's own profile id, so a valid work id belonging to
 * someone else is a 404 — never a 403 that would confirm it exists.
 */
async function requireOwnWork(userId: string, workId: string): Promise<WorkDocument> {
  const profile = await requireOwnProfile(userId);

  if (!Types.ObjectId.isValid(workId)) {
    throw ApiError.notFound('We could not find that work.', undefined, 'WORK_NOT_FOUND');
  }

  const work = await Work.findOne({ _id: workId, profile: profile.id });

  if (!work) {
    throw ApiError.notFound('We could not find that work.', undefined, 'WORK_NOT_FOUND');
  }

  return work;
}

function dropEmptyStrings(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== '' && v !== undefined));
}
