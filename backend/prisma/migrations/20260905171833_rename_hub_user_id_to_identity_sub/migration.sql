-- Pure rename (docs/decisions.md login OIDC conversion ADR): hubUserId held
-- the hub's old user id; identitySub holds login.blonskyi.dev's `sub` claim.
-- RENAME preserves existing rows' data instead of drop+add.
ALTER TABLE "users" RENAME COLUMN "hubUserId" TO "identitySub";
ALTER INDEX "users_hubUserId_key" RENAME TO "users_identitySub_key";
