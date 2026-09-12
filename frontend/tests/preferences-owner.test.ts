import { describe, expect, it } from 'vitest';
import {
  ANON_OWNER,
  fnv1a32,
  modeStorageKey,
  preferenceOwner,
} from '@/features/preferences/owner';
import { MODE_COOKIE } from '@/features/preferences/types';

describe('preferenceOwner', () => {
  it('maps a missing user id to the anon owner', () => {
    expect(preferenceOwner(null)).toBe(ANON_OWNER);
    expect(preferenceOwner(undefined)).toBe(ANON_OWNER);
    expect(preferenceOwner('')).toBe(ANON_OWNER);
  });

  it('is stable for the same id and differs across ids', () => {
    const a = preferenceOwner('user-1');
    const b = preferenceOwner('user-1');
    const c = preferenceOwner('user-2');

    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('yields 8 lowercase hex characters', () => {
    expect(fnv1a32('user-1')).toMatch(/^[0-9a-f]{8}$/);
    expect(preferenceOwner('user-1')).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('modeStorageKey', () => {
  it('composes the mode cookie name with the owner', () => {
    expect(modeStorageKey('abc12345')).toBe(`${MODE_COOKIE}.abc12345`);
    expect(modeStorageKey(ANON_OWNER)).toBe(`${MODE_COOKIE}.anon`);
  });
});
