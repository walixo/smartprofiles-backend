import type { DisciplineSlug, MediaKind, WorkVisibility } from '../../shared/vocabulary.js';
import type { WorkDocument } from './work.model.js';

export interface PublicWorkMedia {
  url: string;
  kind: MediaKind;
  alt?: string;
  width?: number;
  height?: number;
}

export interface PublicWork {
  id: string;
  title: string;
  description?: string;
  year?: number;
  role?: string;
  clientName?: string;
  disciplines: DisciplineSlug[];
  coverImage?: string;
  media: PublicWorkMedia[];
  externalUrl?: string;
  order: number;
}

/** Adds the owner-only field; hidden works never reach a public read at all. */
export interface OwnerWork extends PublicWork {
  visibility: WorkVisibility;
  updatedAt: string;
}

export function toPublicWork(work: WorkDocument): PublicWork {
  return {
    id: String(work.id),
    title: work.title,
    ...optional('description', work.description),
    ...optional('year', work.year),
    ...optional('role', work.role),
    ...optional('clientName', work.clientName),
    disciplines: work.disciplines,
    ...optional('coverImage', work.coverImage),
    media: work.media.map((item) => ({
      url: item.url,
      kind: item.kind,
      ...optional('alt', item.alt),
      ...optional('width', item.width),
      ...optional('height', item.height),
    })),
    ...optional('externalUrl', work.externalUrl),
    order: work.order,
  };
}

export function toOwnerWork(work: WorkDocument): OwnerWork {
  return {
    ...toPublicWork(work),
    visibility: work.visibility,
    updatedAt: work.updatedAt.toISOString(),
  };
}

/** Omits the key entirely rather than emitting `undefined` into JSON. */
function optional<K extends string, V>(key: K, value: V | undefined | null | ''): Record<K, V> | Record<string, never> {
  return value === undefined || value === null || value === '' ? {} : ({ [key]: value } as Record<K, V>);
}
