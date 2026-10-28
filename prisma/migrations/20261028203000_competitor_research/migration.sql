-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "resolutionNote" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CompetitorObservation" (
    "id" SERIAL NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "marketId" INTEGER NOT NULL,
    "merchant" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "match" TEXT NOT NULL,
    "comparison" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "shippingMinor" INTEGER,
    "currency" TEXT NOT NULL,
    "taxBasis" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorObservation_opportunityId_marketId_url_observedAt_key" ON "CompetitorObservation"("opportunityId", "marketId", "url", "observedAt");

-- AddForeignKey
ALTER TABLE "CompetitorObservation" ADD CONSTRAINT "CompetitorObservation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorObservation" ADD CONSTRAINT "CompetitorObservation_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

