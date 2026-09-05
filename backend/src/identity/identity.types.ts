// The trusted identity forwarded by the frontend, which has already validated
// the session against login.blonskyi.dev (ADR-003, ADR-016) - the backend never
// verifies a JWT itself, it trusts these headers on the private network.
// identitySub is login's own `sub` claim, not a hub id.
export interface Identity {
  identitySub: string;
  email: string;
  name?: string;
  image?: string;
}
