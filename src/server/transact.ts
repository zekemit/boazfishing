import type { DB } from '@/lib/types';

/** A conditional write lost a race with another writer. */
export class ConflictError extends Error {
  constructor() {
    super('write conflict');
  }
}

/** Too many concurrent writers: tell the caller to retry shortly. */
export class BusyError extends Error {
  constructor() {
    super('busy');
  }
}

export interface Snapshot {
  db: DB;
  /** Opaque version token (an ETag for Blob). null for backends that serialize writes themselves. */
  version: string | null;
}

export interface DbBackend {
  read(): Promise<Snapshot | null>;
  /** `expected === null` means "create; must not exist yet". Throws ConflictError if someone else wrote first. */
  write(db: DB, expected: string | null): Promise<void>;
}

interface Hooks {
  seed: () => DB;
  normalize: (db: DB) => DB;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Optimistic transaction: read, apply `fn`, write back only if nobody changed the data in between.
 * If another instance wins the race, read again and re-run `fn`, so `fn` must be free of side effects.
 * Throwing from `fn` aborts without writing. This is what makes double-booking impossible across
 * serverless instances, not just inside one process.
 */
export async function transact<T>(
  backend: DbBackend,
  fn: (db: DB) => T | Promise<T>,
  hooks: Hooks,
  maxAttempts = 12,
): Promise<{ result: T; db: DB }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const snap = await backend.read();
    const db = snap ? hooks.normalize(snap.db) : hooks.seed();
    const result = await fn(db);
    try {
      await backend.write(db, snap ? snap.version : null);
      return { result, db };
    } catch (e) {
      if (!(e instanceof ConflictError)) throw e;
      await sleep(20 + Math.random() * 60 * (attempt + 1));
    }
  }
  throw new BusyError();
}
