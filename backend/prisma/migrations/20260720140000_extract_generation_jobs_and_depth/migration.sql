CREATE TYPE "GenerationJobType" AS ENUM ('ROOT', 'BRANCH', 'EDITOR');
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "GenerationJob" (
  "id" TEXT NOT NULL,
  "generationId" TEXT NOT NULL,
  "type" "GenerationJobType" NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureMessage" TEXT,
  CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GenerationJob_generationId_key" ON "GenerationJob"("generationId");
CREATE INDEX "GenerationJob_status_queuedAt_idx" ON "GenerationJob"("status", "queuedAt");

INSERT INTO "GenerationJob" (
  "generationId", "type", "status", "payload", "attempts", "queuedAt", "startedAt", "completedAt", "failedAt", "failureMessage"
)
SELECT
  'job-' || "id",
  CASE "jobType"
    WHEN 'root' THEN 'ROOT'::"GenerationJobType"
    WHEN 'branch' THEN 'BRANCH'::"GenerationJobType"
    WHEN 'editor' THEN 'EDITOR'::"GenerationJobType"
  END,
  CASE "status"
    WHEN 'queued' THEN 'QUEUED'::"JobStatus"
    WHEN 'processing' THEN 'PROCESSING'::"JobStatus"
    WHEN 'failed' THEN 'FAILED'::"JobStatus"
    ELSE 'COMPLETED'::"JobStatus"
  END,
  COALESCE("jobPayload", '{}'::jsonb),
  "attempts",
  COALESCE("queuedAt", "createdAt"),
  "startedAt",
  "completedAt",
  "failedAt",
  "failureMessage"
FROM "Generation"
WHERE "jobType" IN ('root', 'branch', 'editor');

CREATE TABLE "GenerationDepth" (
  "generationId" TEXT NOT NULL,
  "previewUrl" TEXT,
  "raw16Url" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GenerationDepth_pkey" PRIMARY KEY ("generationId")
);

INSERT INTO "GenerationDepth" ("generationId", "previewUrl", "raw16Url", "createdAt", "updatedAt")
SELECT "id", "depthPreviewUrl", "depthRaw16Url", "createdAt", "updatedAt"
FROM "Generation"
WHERE "depthPreviewUrl" IS NOT NULL OR "depthRaw16Url" IS NOT NULL;

ALTER TABLE "GenerationJob"
  ADD CONSTRAINT "GenerationJob_generationId_fkey"
  FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GenerationDepth"
  ADD CONSTRAINT "GenerationDepth_generationId_fkey"
  FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Generation"
  DROP COLUMN "jobType",
  DROP COLUMN "jobPayload",
  DROP COLUMN "queuedAt",
  DROP COLUMN "startedAt",
  DROP COLUMN "completedAt",
  DROP COLUMN "failedAt",
  DROP COLUMN "failureMessage",
  DROP COLUMN "attempts",
  DROP COLUMN "depthPreviewUrl",
  DROP COLUMN "depthRaw16Url";
