import { describe, expect, it } from 'vitest';
import { contentHash } from '../src/shared/hash';

describe('contentHash', () => {
  it('is order-independent for object keys', () => {
    const a = contentHash({ x: 1, y: 2 });
    const b = contentHash({ y: 2, x: 1 });
    expect(a).toBe(b);
  });

  it('is order-sensitive for arrays', () => {
    const a = contentHash([1, 2, 3]);
    const b = contentHash([3, 2, 1]);
    expect(a).not.toBe(b);
  });

  it('distinguishes nested differences', () => {
    const a = contentHash({ a: { b: 1 } });
    const b = contentHash({ a: { b: 2 } });
    expect(a).not.toBe(b);
  });

  it('returns a 64-char hex string (SHA-256)', () => {
    expect(contentHash({})).toMatch(/^[a-f0-9]{64}$/);
  });
});
