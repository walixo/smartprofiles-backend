import { z } from 'zod';
import { DISCIPLINES, MEDIA_KINDS, WORK_VISIBILITIES } from '../../shared/vocabulary.js';

const mediaSchema = z.object({
  url: z.url('Enter a valid media URL.').max(2048),
  kind: z.enum(MEDIA_KINDS),
  alt: z.string().trim().max(200).optional().or(z.literal('')),
  width: z.number().int().min(1).max(20000).optional(),
  height: z.number().int().min(1).max(20000).optional(),
});

const currentYear = new Date().getFullYear();

const workFields = {
  title: z.string().trim().min(2, 'Give the work a title.').max(140),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  year: z.number().int().min(1970).max(currentYear + 1).optional(),
  role: z.string().trim().max(80).optional().or(z.literal('')),
  clientName: z.string().trim().max(80).optional().or(z.literal('')),
  disciplines: z.array(z.enum(DISCIPLINES)).max(5, 'Up to 5 disciplines.'),
  coverImage: z.url('Enter a valid image URL.').max(2048).optional().or(z.literal('')),
  media: z.array(mediaSchema).max(12, 'Up to 12 media items.'),
  externalUrl: z.url('Enter a valid URL, including https://').max(2048).optional().or(z.literal('')),
  visibility: z.enum(WORK_VISIBILITIES),
};

export const createWorkSchema = z.object({
  title: workFields.title,
  description: workFields.description,
  year: workFields.year,
  role: workFields.role,
  clientName: workFields.clientName,
  disciplines: workFields.disciplines.default([]),
  coverImage: workFields.coverImage,
  media: workFields.media.default([]),
  externalUrl: workFields.externalUrl,
  visibility: workFields.visibility.default('public'),
});

export const updateWorkSchema = z
  .object(workFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

/**
 * Full ordered list of work ids. Sending the whole order rather than a
 * from/to pair keeps the result deterministic when several tabs reorder.
 */
export const reorderWorksSchema = z.object({
  order: z.array(z.string().regex(/^[a-f\d]{24}$/i, 'Not a valid id.')).min(1).max(200),
});

export type CreateWorkInput = z.infer<typeof createWorkSchema>;
export type UpdateWorkInput = z.infer<typeof updateWorkSchema>;
export type ReorderWorksInput = z.infer<typeof reorderWorksSchema>;
