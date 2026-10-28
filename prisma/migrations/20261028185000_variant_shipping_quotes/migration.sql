-- AlterTable
ALTER TABLE "Market" ADD COLUMN     "countryCode" TEXT;

-- CreateTable
CREATE TABLE "SupplierVariant" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "priceMinor" INTEGER,
    "origins" JSONB NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SupplierVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingQuote" (
    "id" SERIAL NOT NULL,
    "variantId" INTEGER NOT NULL,
    "marketId" INTEGER NOT NULL,
    "originCountry" TEXT NOT NULL,
    "destinationCountry" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "deliveryEstimate" TEXT,
    "productPriceMinor" INTEGER,
    "shippingMinor" INTEGER NOT NULL,
    "taxesMinor" INTEGER,
    "clearanceMinor" INTEGER,
    "totalPostageMinor" INTEGER,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierVariant_listingId_externalId_key" ON "SupplierVariant"("listingId", "externalId");

-- CreateIndex
CREATE INDEX "ShippingQuote_variantId_observedAt_idx" ON "ShippingQuote"("variantId", "observedAt");

-- AddForeignKey
ALTER TABLE "SupplierVariant" ADD CONSTRAINT "SupplierVariant_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SourceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingQuote" ADD CONSTRAINT "ShippingQuote_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SupplierVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingQuote" ADD CONSTRAINT "ShippingQuote_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

