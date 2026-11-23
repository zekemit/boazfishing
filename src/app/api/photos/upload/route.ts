import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import sharp from 'sharp';
import { PHOTO_SLOT_IDS, type PhotoSlotId } from '@/lib/types';
import { mutate } from '@/server/db';
import { guardAdmin, guarded, HttpError, json } from '@/server/http';
import { removeOrphanedUpload, resolveAll } from '@/server/photos';
import { mediaBackend } from '@/server/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BYTES = 20 * 1024 * 1024;

type Kind = 'jpeg' | 'png' | 'webp' | 'gif' | 'avif';

/** Identify the real file type from its first bytes (never trust the file name or declared type). */
function sniff(b: Buffer): Kind | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return 'png';
  if (b.toString('ascii', 0, 3) === 'GIF') return 'gif';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (b.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(b.toString('ascii', 8, 12))) return 'avif';
  return null;
}

/** Admin: upload a photo into a slot. Resized to 2000px max, rotated upright, metadata (incl. GPS) stripped. */
export async function POST(req: NextRequest) {
  return guarded(async () => {
    const denied = await guardAdmin();
    if (denied) return denied;

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new HttpError(400, 'Could not read the upload. Try a smaller photo.');
    }
    const slot = String(form.get('slot') ?? '') as PhotoSlotId;
    const file = form.get('file');
    if (!PHOTO_SLOT_IDS.includes(slot)) throw new HttpError(400, 'Unknown photo slot.');
    if (!(file instanceof File) || file.size === 0) throw new HttpError(400, 'Choose a photo to upload.');
    if (file.size > MAX_BYTES) throw new HttpError(413, 'That photo is over 20 MB. Try a smaller one.');

    const input = Buffer.from(await file.arrayBuffer());
    const kind = sniff(input);
    if (!kind) throw new HttpError(415, 'Use a JPG, PNG, WebP, GIF or AVIF photo.');

    let output: Buffer;
    let ext: string;
    if (kind === 'gif') {
      output = input; // keep animation as-is
      ext = 'gif';
    } else {
      try {
        output = await sharp(input).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
        ext = 'webp';
      } catch {
        throw new HttpError(422, "That image couldn't be processed. Try exporting it as a JPG first.");
      }
    }

    const name = `${slot}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
    await mediaBackend().put(name, output, ext === 'gif' ? 'image/gif' : 'image/webp');

    const { oldSrc, photos } = await mutate((db) => {
      const current = db.photos[slot];
      const previous = current.src;
      current.src = `/api/media/${name}`;
      current.hidden = false;
      return { oldSrc: previous, photos: db.photos };
    });
    await removeOrphanedUpload(photos, oldSrc);
    return json({ photos, resolved: resolveAll(photos) });
  });
}
