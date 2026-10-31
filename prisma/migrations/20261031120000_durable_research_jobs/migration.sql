CREATE TABLE "ResearchJob" (
 "id" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'QUEUED',
 "steps" JSONB NOT NULL,
 "cursor" INTEGER NOT NULL DEFAULT 0,
 "stopRequested" BOOLEAN NOT NULL DEFAULT false,
 "leaseToken" TEXT,
 "leaseUntil" TIMESTAMP(3),
 "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "finishedAt" TIMESTAMP(3),
 CONSTRAINT "ResearchJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ResearchJob_state_nextRunAt_idx" ON "ResearchJob"("state", "nextRunAt");
