// Tiny disk cache with TTL. FR open-data endpoints are polite-use but slow
// (BODACC/Comext can take seconds); during research iterations we hit the
// same SIREN/sector repeatedly, so we memoize responses on disk.
//
// Deliberately filesystem-only and dependency-free: key → JSON file under
// a cache dir (default os.tmpdir()/is-fr-cache, override via FR_CACHE_DIR).
// A Postgres-backed cache can implement the same `Cache` interface later
// without touching call sites.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
}

interface Envelope<T> {
  expiresAt: number;
  value: T;
}

export class DiskCache implements Cache {
  private dir: string;
  private now: () => number;

  constructor(opts: { dir?: string; now?: () => number } = {}) {
    this.dir = opts.dir ?? process.env.FR_CACHE_DIR ?? join(tmpdir(), 'is-fr-cache');
    this.now = opts.now ?? (() => Date.now());
  }

  private path(key: string): string {
    const h = createHash('sha1').update(key).digest('hex');
    return join(this.dir, `${h}.json`);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await readFile(this.path(key), 'utf8');
      const env = JSON.parse(raw) as Envelope<T>;
      if (env.expiresAt < this.now()) return null;
      return env.value;
    } catch {
      return null; // miss or unreadable → treat as miss
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const env: Envelope<T> = { expiresAt: this.now() + ttlMs, value };
    await writeFile(this.path(key), JSON.stringify(env), 'utf8');
  }
}

/** No-op cache for tests / when caching is undesirable. */
export class NullCache implements Cache {
  async get<T>(): Promise<T | null> {
    return null;
  }
  async set<T>(): Promise<void> {
    /* no-op */
  }
}

export const DAY_MS = 24 * 60 * 60 * 1000;
