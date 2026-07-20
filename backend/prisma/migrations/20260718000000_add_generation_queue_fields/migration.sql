ALTER TABLE "Generation"
  ADD COLUMN "jobType" TEXT,
  ADD COLUMN "jobPayload" JSONB,
  ADD COLUMN "queuedAt" TIMESTAMP(3),
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "failedAt" TIMESTAMP(3),
  ADD COLUMN "failureMessage" TEXT,
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Generation_status_createdAt_idx" ON "Generation"("status", "createdAt");
CREATE INDEX "Generation_projectId_createdAt_idx" ON "Generation"("projectId", "createdAt");
CREATE INDEX "Generation_parentId_idx" ON "Generation"("parentId");
