import { createHash } from 'node:crypto';
import { cloudinary, env } from '../../config/env.js';
import { ApiError } from '../../utils/api-error.js';
import type { UploadKind } from './upload.schema.js';

/**
 * Formats the browser is permitted to upload.
 *
 * Signed into the request, so it is enforced by Cloudinary rather than trusted
 * from the client — a tampered form cannot smuggle an SVG (a scriptable format)
 * or an arbitrary binary into the account.
 */
const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,avif';

/** Client-side guard; also documented to the UI so it can reject before uploading. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface UploadSignature {
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  maxBytes: number;
}

/**
 * Produces a short-lived signature authorising one direct browser upload.
 *
 * The file never passes through this server: the browser posts it straight to
 * Cloudinary. That keeps large bodies out of a serverless function (where they
 * would hit body-size and duration limits) and keeps the API secret here.
 */
export function createUploadSignature(userId: string, kind: UploadKind): UploadSignature {
  if (!cloudinary) {
    throw new ApiError(
      503,
      'Image uploads are not configured on this server.',
      'UPLOADS_DISABLED',
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Scoped per user, so a signature obtained for one account cannot be used to
  // overwrite another account's images.
  const folder = `smart-profiles/${env.NODE_ENV}/${userId}/${kind}`;

  const signedParams: Record<string, string | number> = {
    allowed_formats: ALLOWED_FORMATS,
    folder,
    overwrite: 'false',
    timestamp,
    unique_filename: 'true',
  };

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/image/upload`,
    cloudName: cloudinary.cloudName,
    apiKey: cloudinary.apiKey,
    timestamp,
    signature: signParams(signedParams, cloudinary.apiSecret),
    folder,
    allowedFormats: ALLOWED_FORMATS,
    maxBytes: MAX_UPLOAD_BYTES,
  };
}

/**
 * Cloudinary's signing scheme: parameters sorted by key, joined as
 * `key=value` pairs with `&`, the API secret appended, then SHA-1.
 *
 * `file`, `cloud_name`, `resource_type` and `api_key` are excluded by the
 * specification and must not be passed in here.
 */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join('&');

  return createHash('sha1').update(`${canonical}${apiSecret}`).digest('hex');
}
