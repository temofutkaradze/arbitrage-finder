-- CreateTable
CREATE TABLE "ListingIdentity" (
    "listingId" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "gtin" TEXT,
    "brand" TEXT,
    "mpn" TEXT,
    "packUnits" INTEGER,
    "variantKey" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingIdentity_pkey" PRIMARY KEY ("listingId")
);

-- CreateTable
CREATE TABLE "IdentityRevision" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingLinkDecision" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingLinkDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingIdentity_gtin_idx" ON "ListingIdentity"("gtin");

-- CreateIndex
CREATE INDEX "ListingIdentity_brand_mpn_idx" ON "ListingIdentity"("brand", "mpn");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityRevision_listingId_revision_key" ON "IdentityRevision"("listingId", "revision");

-- CreateIndex
CREATE INDEX "ListingLinkDecision_listingId_createdAt_idx" ON "ListingLinkDecision"("listingId", "createdAt");

-- AddForeignKey
ALTER TABLE "ListingIdentity" ADD CONSTRAINT "ListingIdentity_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SourceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

