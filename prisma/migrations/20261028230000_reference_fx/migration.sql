-- CreateTable
CREATE TABLE "FxSnapshot" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "rate" TEXT NOT NULL,
    "rateDate" TIMESTAMP(3) NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceUrl" TEXT NOT NULL,

    CONSTRAINT "FxSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FxSnapshot_provider_currency_rateDate_rate_key" ON "FxSnapshot"("provider", "currency", "rateDate", "rate");

