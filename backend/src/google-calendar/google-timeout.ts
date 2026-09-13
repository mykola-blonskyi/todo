// Google is a third party that can be slow or unreachable, and undici's
// default leaves a stalled response hanging until its 300s headers timeout.
// Rule 10 declines to cap the size of a bulk delete, and each List in one
// costs a token refresh plus an event delete per synced user, sequentially -
// so without a bound here a single GraphQL request can hold a connection for
// tens of minutes.
export const GOOGLE_TIMEOUT_MS = 10_000;
