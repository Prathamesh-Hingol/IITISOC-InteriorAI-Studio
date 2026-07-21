-- Remove ROOT from GenerationJobType enum
-- Root generations are now synchronous (no queue), so the ROOT value is obsolete.
-- PostgreSQL requires creating a new enum, migrating the column, then renaming.

CREATE TYPE "GenerationJobType_new" AS ENUM ('BRANCH', 'EDITOR');

ALTER TABLE "GenerationJob"
  ALTER COLUMN "type" TYPE "GenerationJobType_new"
  USING "type"::text::"GenerationJobType_new";

DROP TYPE "GenerationJobType";

ALTER TYPE "GenerationJobType_new" RENAME TO "GenerationJobType";
