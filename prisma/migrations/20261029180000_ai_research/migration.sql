CREATE TABLE "AiResearchRun" (
 "id" SERIAL NOT NULL,
 "opportunityId" INTEGER NOT NULL,
 "model" TEXT NOT NULL,
 "state" TEXT NOT NULL,
 "inputHash" TEXT NOT NULL,
 "snapshot" JSONB NOT NULL,
 "report" JSONB,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "finishedAt" TIMESTAMP(3),
 CONSTRAINT "AiResearchRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiResearchRun_opportunityId_id_idx" ON "AiResearchRun"("opportunityId", "id");
CREATE INDEX "AiResearchRun_createdAt_idx" ON "AiResearchRun"("createdAt");
ALTER TABLE "AiResearchRun" ADD CONSTRAINT "AiResearchRun_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "AiResearchBudget" (
 "id" TEXT NOT NULL,
 "day" TEXT NOT NULL,
 "attempts" INTEGER NOT NULL,
 "lastStartedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AiResearchBudget_pkey" PRIMARY KEY ("id")
);
