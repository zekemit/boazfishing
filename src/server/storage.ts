import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { BlobNotFoundError, BlobPreconditionFailedError, del, get, put } from '@vercel/blob';
import type { DB } from '@/lib/types';
import { ConflictError, type DbBackend } from './transact';

/**
 * Two storage backends behind one interface:
 *  - Files (default, zero config): ./data/db.json and ./data/uploads. Used locally and on any host with a disk.
 *  - Vercel Blob (automatic when BLOB_READ_WRITE_TOKEN is set): a private store, because serverless
 *    functions have no durable disk. Writes are conditional on the blob's ETag.
 */
export const DATA_DIR = process.env.BOAZ_DATA_DIR ? path.resolve(process.env.BOAZ_DATA_DIR) : path.join(process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export const usingBlob = (): boolean => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export interface MediaBackend {
  put(name: string, data: Buffer, contentType: string): Promise<void>;
  get(name: string): Promise<{ data: Buffer; contentType: string } | null>;
  remove(name: string): Promise<void>;
}

const TYPES: Record<string, string> = {
  webp: 'image/webp',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  avif: 'image/avif',
};
export const contentTypeFor = (name: string): string | undefined => TYPES[name.split('.').pop()?.toLowerCase() ?? ''];

/* ------------------------------------------------------------------ files */

const fileDb: DbBackend = {
  async read() {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) return null;
    try {
      return { db: JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as DB, version: null };
    } catch {
      // Unreadable file: keep a copy for inspection and start fresh rather than crash.
      fs.renameSync(DB_FILE, path.join(DATA_DIR, `db.corrupt-${Date.now()}.json`));
      return null;
    }
  },
  async write(db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE); // atomic: readers always see a complete file
  },
};

const fileMedia: MediaBackend = {
  async put(name, data) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, name), data);
  },
  async get(name) {
    try {
      return { data: fs.readFileSync(path.join(UPLOAD_DIR, name)), contentType: contentTypeFor(name) ?? 'application/octet-stream' };
    } catch {
      return null;
    }
  },
  async remove(name) {
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, name));
    } catch {
      /* already gone */
    }
  },
};

/* ------------------------------------------------------------------- blob */

const DB_PATH = 'boaz/db.json';
const MEDIA_DIR = 'boaz/media/';

const blobDb: DbBackend = {
  async read() {
    let res;
    try {
      res = await get(DB_PATH, { access: 'private', useCache: false }); // always the latest version, never a CDN copy
    } catch (e) {
      if (e instanceof BlobNotFoundError) return null;
      throw e;
    }
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    // The content response can carry a weak ETag (W/"...") from a caching layer; conditional writes compare the strong one.
    return { db: JSON.parse(await new Response(res.stream).text()) as DB, version: res.blob.etag.replace(/^W\//, '') };
  },
  async write(db, expected) {
    try {
      await put(DB_PATH, JSON.stringify(db), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: expected !== null,
        ...(expected !== null ? { ifMatch: expected } : {}),
      });
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError) {
        console.warn('[blob] conditional write lost the race', { expected });
        throw new ConflictError();
      }
      // Create race: two instances seeded at once and the other one won. Re-read instead of failing.
      if (expected === null && (await blobDb.read())) throw new ConflictError();
      throw e;
    }
  },
};

const blobMedia: MediaBackend = {
  async put(name, data, contentType) {
    await put(MEDIA_DIR + name, data, { access: 'private', contentType, addRandomSuffix: false, allowOverwrite: false });
  },
  async get(name) {
    let res;
    try {
      res = await get(MEDIA_DIR + name, { access: 'private' });
    } catch (e) {
      if (e instanceof BlobNotFoundError) return null;
      throw e;
    }
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    return {
      data: Buffer.from(await new Response(res.stream).arrayBuffer()),
      contentType: res.blob.contentType ?? contentTypeFor(name) ?? 'application/octet-stream',
    };
  },
  async remove(name) {
    try {
      await del(MEDIA_DIR + name);
    } catch {
      /* already gone */
    }
  },
};

export const dbBackend = (): DbBackend => (usingBlob() ? blobDb : fileDb);
export const mediaBackend = (): MediaBackend => (usingBlob() ? blobMedia : fileMedia);
