// Thrown wherever Google tells us our OAuth grant is gone: a token refresh
// answered with `invalid_grant`, or a Calendar API call answered with 401.
// Both mean the same thing in practice - the User revoked todolist's access
// from their Google Account - and both make the stored connection unusable
// until they reconnect (business-rules.md Rule 29).
export class GoogleGrantRevokedError extends Error {
  constructor(reason: string) {
    super(`Google revoked todolist's Calendar grant: ${reason}`);
    this.name = 'GoogleGrantRevokedError';
  }
}
