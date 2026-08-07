import { model, Schema, type HydratedDocument, type Model, type Types } from 'mongoose';
import {
  DISCIPLINES,
  MEDIA_KINDS,
  WORK_VISIBILITIES,
  type DisciplineSlug,
  type MediaKind,
  type WorkVisibility,
} from '../../shared/vocabulary.js';

export interface WorkMedia {
  url: string;
  kind: MediaKind;
  alt?: string;
  width?: number;
  height?: number;
}

export interface WorkAttrs {
  profile: Types.ObjectId;
  title: string;
  description?: string;
  year?: number;
  role?: string;
  clientName?: string;
  disciplines: DisciplineSlug[];
  coverImage?: string;
  media: WorkMedia[];
  externalUrl?: string;
  /** Manual sort position within the owning profile. Lower renders first. */
  order: number;
  visibility: WorkVisibility;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkDocument = HydratedDocument<WorkAttrs>;
export type WorkModelType = Model<WorkAttrs>;

/** Upper bound on `year`, recomputed per validation so it never goes stale. */
function maxYear(): number {
  return new Date().getFullYear() + 1;
}

const mediaSchema = new Schema<WorkMedia>(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    kind: { type: String, required: true, enum: MEDIA_KINDS },
    alt: { type: String, trim: true, maxlength: 200 },
    width: { type: Number, min: 1, max: 20000 },
    height: { type: Number, min: 1, max: 20000 },
  },
  { _id: false },
);

const workSchema = new Schema<WorkAttrs, WorkModelType>(
  {
    profile: { type: Schema.Types.ObjectId, ref: 'Profile', required: true, immutable: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 4000 },
    year: {
      type: Number,
      min: 1970,
      validate: {
        validator: (value: number) => value <= maxYear(),
        message: 'That year is too far in the future.',
      },
    },
    role: { type: String, trim: true, maxlength: 80 },
    clientName: { type: String, trim: true, maxlength: 80 },
    disciplines: {
      type: [{ type: String, enum: DISCIPLINES }],
      default: [],
      validate: { validator: (v: string[]) => v.length <= 5, message: 'Up to 5 disciplines.' },
    },
    coverImage: { type: String, trim: true, maxlength: 2048 },
    media: {
      type: [mediaSchema],
      default: [],
      validate: { validator: (v: unknown[]) => v.length <= 12, message: 'Up to 12 media items.' },
    },
    externalUrl: { type: String, trim: true, maxlength: 2048 },
    order: { type: Number, required: true, default: 0 },
    visibility: { type: String, required: true, enum: WORK_VISIBILITIES, default: 'public' },
  },
  { timestamps: true },
);

workSchema.index({ profile: 1, order: 1 });

export const Work = model<WorkAttrs, WorkModelType>('Work', workSchema);
