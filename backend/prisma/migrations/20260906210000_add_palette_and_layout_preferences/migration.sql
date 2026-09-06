-- Appearance preferences split into three independent axes (see the layouts
-- ADR in docs/decisions.md):
--   theme   - light / dark / system (was: light / dark / theme-rose)
--   palette - colour palette, new column
--   layout  - app shell / page composition, new column
-- The old `theme-rose` value carried both the palette AND the (light) mode,
-- so existing rows are migrated to theme=light + palette=rose before that
-- value is dropped from the enum.

-- CreateEnum
CREATE TYPE "UserPalette" AS ENUM ('classic', 'rose', 'indigo', 'ocean', 'forest', 'olive', 'honey', 'clay', 'coral', 'violet', 'graphite', 'paper');

-- CreateEnum
CREATE TYPE "UserLayout" AS ENUM ('workspace', 'board', 'notebook', 'pocket', 'terminal', 'ledger');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "palette" "UserPalette" NOT NULL DEFAULT 'classic',
ADD COLUMN "layout" "UserLayout" NOT NULL DEFAULT 'workspace';

-- Data migration: theme-rose -> light mode + rose palette
UPDATE "users" SET "palette" = 'rose' WHERE "theme" = 'theme-rose';

-- AlterEnum: UserTheme (light, dark, theme-rose) -> (light, dark, system)
BEGIN;
CREATE TYPE "UserTheme_new" AS ENUM ('light', 'dark', 'system');
ALTER TABLE "users" ALTER COLUMN "theme" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "theme" TYPE "UserTheme_new"
  USING (CASE WHEN "theme"::text = 'theme-rose' THEN 'light' ELSE "theme"::text END)::"UserTheme_new";
ALTER TYPE "UserTheme" RENAME TO "UserTheme_old";
ALTER TYPE "UserTheme_new" RENAME TO "UserTheme";
DROP TYPE "UserTheme_old";
ALTER TABLE "users" ALTER COLUMN "theme" SET DEFAULT 'light';
COMMIT;
