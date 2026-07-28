// The trusted identity forwarded by the frontend, which has already validated
// the session against the hub (see docs/decisions.md ADR-003) - the backend
// never verifies a JWT itself, it trusts these headers on the private network.
export interface Identity {
  hubUserId: string;
  email: string;
  name?: string;
  image?: string;
}
