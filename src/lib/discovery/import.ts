import { prisma } from "../db/prisma";
import type { ListingInput } from "./schema";

export async function importListings(rows: ListingInput[], source: string) {
  return prisma.$transaction(async (tx) => {
    // Serialize imports/promotions across requests, including separate workers.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340921)`;
    const importedVia = source === "cj" ? "CJ_API" : "MANUAL_IMPORT";
    const counts = { created: 0, updated: 0, unchanged: 0 };
    for (const row of rows) {
      const key = { provider: row.provider, externalId: row.externalId, variantId: row.variantId };
      const existing = await tx.sourceListing.findUnique({ where: { provider_externalId_variantId: key } });
      if (!existing) {
        await tx.sourceListing.create({ data: { ...row, importedVia, observations: { create: {
          priceMinor: row.priceMinor, currency: row.currency, observedAt: row.observedAt, importedVia,
        } } } });
        counts.created++;
        continue;
      }
      const timestamp = row.observedAt.getTime() - existing.observedAt.getTime();
      if (timestamp < 0) throw new Error("An import contains older observations than the current catalogue. Nothing was saved.");
      const changed = existing.priceMinor !== row.priceMinor || existing.currency !== row.currency || existing.name !== row.name || existing.url !== row.url;
      if (timestamp === 0 && changed) throw new Error("Conflicting values for the same observation date. Nothing was saved.");
      if (timestamp === 0) { counts.unchanged++; continue; }
      await tx.sourceListing.update({ where: { id: existing.id }, data: { ...row, importedVia } });
      await tx.listingObservation.create({ data: {
        listingId: existing.id, priceMinor: row.priceMinor, currency: row.currency, observedAt: row.observedAt, importedVia,
      } });
      if (changed) counts.updated++; else counts.unchanged++;
    }
    await tx.importRun.create({ data: { source, ...counts } });
    return counts;
  }, { timeout: 20_000 });
}

export async function promoteListing(listingId: number) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340921)`;
    const listing = await tx.sourceListing.findUniqueOrThrow({ where: { id: listingId } });
    if (listing.opportunityId) return listing.opportunityId;
    const opportunity = await tx.opportunity.create({ data: {
      name: listing.name, sourceName: listing.provider, sourceUrl: listing.url,
      notes: "Imported catalogue candidate. Confirm the exact variant, supplier quote, shipping, demand and fulfilment before testing. Catalogue cost has not been copied to market evaluations.",
    } });
    await tx.sourceListing.update({ where: { id: listingId }, data: { opportunityId: opportunity.id } });
    return opportunity.id;
  });
}
