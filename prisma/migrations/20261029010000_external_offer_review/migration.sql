-- CreateTable
CREATE TABLE "ExternalOffer" (
    "id" SERIAL NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "marketId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "observationId" INTEGER,

    CONSTRAINT "ExternalOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalOffer_observationId_key" ON "ExternalOffer"("observationId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalOffer_opportunityId_marketId_provider_externalId_key" ON "ExternalOffer"("opportunityId", "marketId", "provider", "externalId");

-- AddForeignKey
ALTER TABLE "ExternalOffer" ADD CONSTRAINT "ExternalOffer_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalOffer" ADD CONSTRAINT "ExternalOffer_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalOffer" ADD CONSTRAINT "ExternalOffer_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "CompetitorObservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

