-- CreateEnum
CREATE TYPE "DataStatus" AS ENUM ('VERIFIED', 'ESTIMATED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Market" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT false,
    "assumptions" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "notes" TEXT,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" SERIAL NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "marketId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostInput" (
    "id" SERIAL NOT NULL,
    "evaluationId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER,
    "status" "DataStatus" NOT NULL DEFAULT 'UNKNOWN',
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostInput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_code_key" ON "Market"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_opportunityId_marketId_key" ON "Evaluation"("opportunityId", "marketId");

-- CreateIndex
CREATE UNIQUE INDEX "CostInput_evaluationId_key_key" ON "CostInput"("evaluationId", "key");

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostInput" ADD CONSTRAINT "CostInput_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
