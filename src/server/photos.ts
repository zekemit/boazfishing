import fs from 'node:fs';
import path from 'node:path';
import { PHOTO_SLOTS, slotDef } from '@/lib/photos';
import { PHOTO_SLOT_IDS, type DB, type PhotoMap, type PhotoSlotId, type PublicPhoto } from '@/lib/types';
import { mediaBackend } from './storage';

function defaultFileExists(id: PhotoSlotId): boolean {
  // Checked at request time against the real folder, so photos dropped into public/images/boaz show up immediately.
  return fs.existsSync(path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'images', 'boaz', slotDef(id).fileName));
}

/** What a slot actually displays: its custom source, else its default file if that file exists. */
export function resolveSrc(photos: PhotoMap, id: PhotoSlotId): string | null {
  const p = photos[id];
  if (p.src) return p.src;
  return defaultFileExists(id) ? slotDef(id).defaultPath : null;
}

export function getPublicPhotos(db: DB): Record<PhotoSlotId, PublicPhoto & { hidden: boolean }> {
  const out = {} as Record<PhotoSlotId, PublicPhoto & { hidden: boolean }>;
  for (const id of PHOTO_SLOT_IDS) {
    const p = db.photos[id];
    out[id] = {
      src: p.hidden ? null : resolveSrc(db.photos, id),
      alt: p.alt,
      caption: p.caption,
      focusX: p.focusX,
      focusY: p.focusY,
      hidden: p.hidden,
    };
  }
  return out;
}

const MEDIA_PREFIX = '/api/media/';

/** Delete an uploaded file once no slot points at it any more. Call AFTER the change is committed. */
export async function removeOrphanedUpload(photos: PhotoMap, oldSrc: string | null | undefined): Promise<void> {
  if (!oldSrc || !oldSrc.startsWith(MEDIA_PREFIX)) return;
  if (Object.values(photos).some((p) => p.src === oldSrc)) return;
  await mediaBackend().remove(path.basename(oldSrc.slice(MEDIA_PREFIX.length)));
}

export function resolveAll(photos: PhotoMap): Record<PhotoSlotId, string | null> {
  const out = {} as Record<PhotoSlotId, string | null>;
  for (const s of PHOTO_SLOTS) out[s.id] = resolveSrc(photos, s.id);
  return out;
}
