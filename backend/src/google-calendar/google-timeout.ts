// Google is a third party that can be slow or unreachable, and undici's
// default leaves a stalled response hanging until its 300s headers timeout.
export const GOOGLE_TIMEOUT_MS = 10_000;
