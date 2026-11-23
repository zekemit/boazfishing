import type { NextRequest } from 'next/server';
import { mutate, readDb } from '@/server/db';
import { guardAdmin, guarded, HttpError, json, readJson, zodFail } from '@/server/http';
import { removeOrphanedUpload, resolveAll } from '@/server/photos';
import { photoPatch } from '@/server/validate';

export const dynamic = 'force-dynamic';

/** Admin: current photo settings for every slot. */
export async function GET() {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const db = await readDb(3000);
    return json({ photos: db.photos, resolved: resolveAll(db.photos) });
  });
}

/** Admin: update one slot (paste a URL, reset to default, caption, focus, hide). */
export async function PUT(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;
    const parsed = photoPatch.safeParse(await readJson(req));
    if (!parsed.success) return zodFail(parsed.error);
    const { slot, ...patch } = parsed.data;

    const { oldSrc, photos } = await mutate((db) => {
      const current = db.photos[slot];
      if (!current) throw new HttpError(404, 'Unknown photo slot.');
      const previous = current.src;
      if (patch.src !== undefined) current.src = patch.src === '' ? null : patch.src;
      if (patch.alt !== undefined) current.alt = patch.alt;
      if (patch.caption !== undefined) current.caption = patch.caption;
      if (patch.focusX !== undefined) current.focusX = patch.focusX;
      if (patch.focusY !== undefined) current.focusY = patch.focusY;
      if (patch.hidden !== undefined) current.hidden = patch.hidden;
      // Putting a new photo into a hidden slot should show it.
      if (patch.src !== undefined && patch.src !== null && patch.hidden === undefined) current.hidden = false;
      return { oldSrc: previous, photos: db.photos };
    });
    if (patch.src !== undefined) await removeOrphanedUpload(photos, oldSrc);
    return json({ photos, resolved: resolveAll(photos) });
  });
}
