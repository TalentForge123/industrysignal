// Content-hash helper for snapshot equality checks.
//
// The diff worker (HANDOFF §7, lands Week 3) compares consecutive
// snapshots per company and writes an alert when something material
// changed. We do not want to round-trip the full JSONB blob through
// Postgres just to decide that — `content_hash` lets the worker skip
// the write entirely when nothing changed.
//
// Hashing canonicalized JSON (sorted keys) means cosmetic upstream
// reordering — which ARES does occasionally inside `dalsiUdaje` —
// doesn't generate false diffs.

import { createHash } from 'node:crypto';

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = canonicalize(obj[key]);
  }
  return sorted;
}

export function contentHash(value: unknown): string {
  const canonical = JSON.stringify(canonicalize(value));
  return createHash('sha256').update(canonical).digest('hex');
}
