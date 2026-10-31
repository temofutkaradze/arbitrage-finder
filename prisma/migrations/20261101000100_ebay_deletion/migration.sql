CREATE TABLE "EbayDeletion" (
 "id" TEXT NOT NULL,
 "identityHash" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "EbayDeletion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EbayDeletion_identityHash_key" ON "EbayDeletion"("identityHash");
