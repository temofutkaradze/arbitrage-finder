-- CreateTable
CREATE TABLE "SourceListing" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "priceMinor" INTEGER,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "opportunityId" INTEGER,

    CONSTRAINT "SourceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingObservation" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "priceMinor" INTEGER,
    "currency" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "created" INTEGER NOT NULL,
    "updated" INTEGER NOT NULL,
    "unchanged" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" SERIAL NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "marketId" INTEGER,
    "kind" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceListing_provider_externalId_variantId_key" ON "SourceListing"("provider", "externalId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingObservation_listingId_observedAt_key" ON "ListingObservation"("listingId", "observedAt");

-- AddForeignKey
ALTER TABLE "SourceListing" ADD CONSTRAINT "SourceListing_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingObservation" ADD CONSTRAINT "ListingObservation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SourceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

