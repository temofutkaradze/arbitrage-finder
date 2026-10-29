-- CreateTable
CREATE TABLE "FinancialChange" (
    "id" SERIAL NOT NULL,
    "scope" TEXT NOT NULL,
    "recordId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "marketId" INTEGER NOT NULL,
    "evaluationId" INTEGER,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "context" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialChange_evaluationId_id_idx" ON "FinancialChange"("evaluationId", "id");

-- CreateIndex
CREATE INDEX "FinancialChange_marketId_id_idx" ON "FinancialChange"("marketId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialChange_scope_recordId_version_key" ON "FinancialChange"("scope", "recordId", "version");

-- AddForeignKey
ALTER TABLE "FinancialChange" ADD CONSTRAINT "FinancialChange_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialChange" ADD CONSTRAINT "FinancialChange_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinancialChange" ADD CONSTRAINT "FinancialChange_scope_record_check" CHECK (
  ("scope" = 'MARKET' AND "evaluationId" IS NULL AND "recordId" = "marketId") OR
  ("scope" = 'EVALUATION' AND "evaluationId" IS NOT NULL AND "recordId" = "evaluationId")
);
ALTER TABLE "FinancialChange" ADD CONSTRAINT "FinancialChange_version_check" CHECK ("version" >= 0);
