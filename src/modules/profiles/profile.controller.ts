import type { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess } from '../../utils/envelope.js';
import { parseQuery } from '../../utils/parse-query.js';
import {
  browseProfilesQuerySchema,
  handleAvailabilityQuerySchema,
  type CreateProfileInput,
  type SetVisibilityInput,
  type UpdateProfileInput,
} from './profile.schema.js';
import {
  browseProfiles,
  createProfile,
  getOwnProfile,
  getProfileByHandle,
  isHandleAvailable,
  setProfileVisibility,
  updateOwnProfile,
} from './profile.service.js';

export const checkHandle = asyncHandler(async (req: Request, res: Response) => {
  const { handle } = parseQuery(handleAvailabilityQuerySchema, req.query);
  sendSuccess(res, { handle, available: await isHandleAvailable(handle) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const profile = await createProfile(requireUserId(req), req.body as CreateProfileInput);
  sendSuccess(res, { profile }, 201);
});

export const readOwn = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, { profile: await getOwnProfile(requireUserId(req)) });
});

export const updateOwn = asyncHandler(async (req: Request, res: Response) => {
  const profile = await updateOwnProfile(requireUserId(req), req.body as UpdateProfileInput);
  sendSuccess(res, { profile });
});

export const setVisibility = asyncHandler(async (req: Request, res: Response) => {
  const { visibility } = req.body as SetVisibilityInput;
  sendSuccess(res, { profile: await setProfileVisibility(requireUserId(req), visibility) });
});

export const readByHandle = asyncHandler(async (req: Request, res: Response) => {
  const handle = String(req.params.handle ?? '').toLowerCase();
  // `optionalAuthenticate` ran first: a viewer here means "signed in", which is
  // what gates the phone number.
  const profile = await getProfileByHandle(handle, req.user);
  sendSuccess(res, { profile });
});

export const browse = asyncHandler(async (req: Request, res: Response) => {
  const query = parseQuery(browseProfilesQuerySchema, req.query);
  const { items, meta } = await browseProfiles(query);
  sendSuccess(res, { profiles: items, meta });
});

function requireUserId(req: Request): string {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required.', undefined, 'AUTH_REQUIRED');
  }
  return req.user.id;
}
