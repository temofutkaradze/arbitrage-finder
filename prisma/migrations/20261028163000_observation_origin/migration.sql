-- AlterTable
ALTER TABLE "ListingObservation" ADD COLUMN     "importedVia" TEXT NOT NULL DEFAULT 'MANUAL_IMPORT';

-- AlterTable
ALTER TABLE "SourceListing" ADD COLUMN     "importedVia" TEXT NOT NULL DEFAULT 'MANUAL_IMPORT';

