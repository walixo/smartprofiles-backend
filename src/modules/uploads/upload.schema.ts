import { z } from 'zod';

/**
 * What the upload is for. Determines the Cloudinary folder, which is what keeps
 * one user's images from colliding with another's.
 */
export const UPLOAD_KINDS = ['avatar', 'cover', 'work'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const signUploadSchema = z.object({
  kind: z.enum(UPLOAD_KINDS),
});

export type SignUploadInput = z.infer<typeof signUploadSchema>;
