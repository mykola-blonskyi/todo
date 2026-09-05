// The trusted identity forwarded by the frontend, which has already validated
// the session against login.blonskyi.dev (see docs/decisions.md ADR-003 and
// the login OIDC conversion ADR) - the backend never verifies a JWT itself,
// it trusts these headers on the private network. identitySub is login's
// own `sub` claim, not a hub id.
export interface Identity {
  identitySub: string;
  email: string;
  name?: string;
  image?: string;
}
