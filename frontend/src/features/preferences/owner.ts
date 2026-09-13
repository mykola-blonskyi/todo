import { MODE_COOKIE } from './types';

// Pure: theme-provider and PreferenceCookieSync compute this client-side too.
export type PreferenceOwner = string;
export const ANON_OWNER = 'anon';

// Not crypto. It only makes a `sub` short and cookie-safe; forging the stamp
// changes nothing but your own device's appearance.
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function fnv1a32(input: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function preferenceOwner(
  userId: string | null | undefined,
): PreferenceOwner {
  return userId ? fnv1a32(userId) : ANON_OWNER;
}

// `.` suffix matches the existing `authjs.session-token.0` convention.
export function modeStorageKey(owner: PreferenceOwner): string {
  return `${MODE_COOKIE}.${owner}`;
}
