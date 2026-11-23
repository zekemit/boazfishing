import crypto from 'node:crypto';
import type { DB } from '@/lib/types';
import { defaultPhotos } from '@/lib/photos';
import { buildSeed } from './seed';
import { dbBackend, usingBlob } from './storage';
import { transact } from './transact';

/**
 * Persistence with zero setup. Locally it is one JSON file created and seeded on first run.
 * On Vercel (BLOB_READ_WRITE_TOKEN present) it is a private Blob. Either way:
 *  - every write goes through `mutate`: an optimistic transaction that can never overwrite someone
 *    else's change, so two people can never claim the same time slot;
 *  - reads can be served from a short per-instance cache. This matters on Blob, where every read is a
 *    billable operation. A write refreshes the cache straight away.
 */
const g = globalThis as unknown as {
  __boazQueue?: Promise<unknown>;
  __boazCache?: { db: DB; at: number };
};

function normalize(db: DB): DB {
  db.windows ??= [];
  db.bookings ??= [];
  db.photos = { ...defaultPhotos(), ...(db.photos ?? {}) };
  if (!db.secret) db.secret = crypto.randomBytes(32).toString('hex');
  return db;
}

/** Run a write transaction. Throw inside `fn` to abort without saving. `fn` may be re-run, so keep it free of side effects. */
export function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = async () => {
    const { result, db } = await transact(dbBackend(), fn, { seed: buildSeed, normalize });
    g.__boazCache = { db, at: Date.now() };
    return result;
  };
  // Within one process, queue writes so they don't even need to race.
  const prev = g.__boazQueue ?? Promise.resolve();
  const next = prev.then(run, run);
  g.__boazQueue = next.catch(() => undefined);
  return next;
}

/** How stale a plain read may be. Zero locally (files are free to read); short on Blob (reads cost money). */
export const defaultMaxAgeMs = (): number => (usingBlob() ? 20_000 : 0);

/**
 * Read the current data. Pass `maxAgeMs` to accept a cached copy no older than that (0 = always fresh).
 * Triggers first-run seeding (through the write path) if nothing exists yet.
 */
export async function readDb(maxAgeMs: number = defaultMaxAgeMs()): Promise<DB> {
  const cached = g.__boazCache;
  if (cached && maxAgeMs > 0 && Date.now() - cached.at < maxAgeMs) return cached.db;
  const snap = await dbBackend().read();
  if (snap) {
    const db = normalize(snap.db);
    g.__boazCache = { db, at: Date.now() };
    return db;
  }
  return mutate((db) => db);
}
