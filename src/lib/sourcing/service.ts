import { z } from "zod";
import { prisma } from "../db/prisma";
import { requestCj } from "../discovery/cj";
import { originsSchema, normalizeVariants, normalizeFreight, quoteRequestSchema } from "./schema";
import { convertUsdMinor } from "./convert";
import { validRateDate } from "../fx/reference";
import { sourceUrl } from "../discovery/schema";

export const FRESH_FOR_MS = 24 * 3600_000;
export async function reserveCjOperation() {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340922)`;
    const last = await tx.importRun.findFirst({ where: { source: "cj-attempt" }, orderBy: { completedAt: "desc" } });
    if (last && Date.now() - last.completedAt.getTime() < 30_000) throw new Error("Wait 30 seconds between CJ operations.");
    await tx.importRun.create({ data: { source: "cj-attempt", created: 0, updated: 0, unchanged: 0 } });
  });
}
export async function refreshVariants(listingId: number) {
  const listing = await prisma.sourceListing.findUniqueOrThrow({ where: { id: listingId } });
  if (listing.provider !== "cj" || listing.importedVia !== "CJ_API") throw new Error("Select a candidate received directly from CJ.");
  const details = await requestCj("product/query", { pid: listing.externalId });
  // Respect one-request-per-second pacing during this two-endpoint operation.
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const inventory = await requestCj("product/stock/getInventoryByPid", { pid: listing.externalId });
  const variants = normalizeVariants(details, inventory, listing.externalId);
  const observedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340921)`;
    await tx.supplierVariant.updateMany({ where: { listingId }, data: { active: false } });
    for (const variant of variants) await tx.supplierVariant.upsert({
      where: { listingId_externalId: { listingId, externalId: variant.externalId } },
      create: { listingId, ...variant, observedAt }, update: { ...variant, observedAt, active: true },
    });
  }, { timeout: 20_000 });
  return variants.length;
}
export async function fetchFreight(input: z.infer<typeof quoteRequestSchema>) {
  const context = quoteRequestSchema.parse(input);
  const [variant, market] = await Promise.all([
    prisma.supplierVariant.findUniqueOrThrow({ where: { id: context.variantId } }),
    prisma.market.findUniqueOrThrow({ where: { id: context.marketId } }),
  ]);
  if (!market.countryCode) throw new Error("Set this market's destination country in Markets first.");
  if (!variant.active || Date.now() - variant.observedAt.getTime() >= FRESH_FOR_MS) throw new Error("Refresh variant prices and inventory before requesting shipping.");
  const origin = originsSchema.parse(variant.origins).find((o) => o.countryCode === context.originCountry && (o.totalInventory ?? 0) > 0);
  if (!origin) throw new Error("The selected origin has no current positive inventory report for this variant.");
  const data = await requestCj("logistic/freightCalculate", {}, {
    startCountryCode: origin.countryCode, endCountryCode: market.countryCode, zip: context.postalCode,
    products: [{ quantity: 1, vid: variant.externalId }],
  });
  const quotes = normalizeFreight(data), observedAt = new Date();
  if (quotes.length) await prisma.shippingQuote.createMany({ data: quotes.map((q) => ({
    ...q, variantId: variant.id, marketId: market.id, originCountry: origin.countryCode,
    destinationCountry: market.countryCode!, postalCode: context.postalCode, productPriceMinor: variant.priceMinor, productObservedAt: variant.observedAt,
    observedAt, expiresAt: new Date(Math.min(observedAt.getTime(), variant.observedAt.getTime()) + FRESH_FOR_MS),
  })) });
  return quotes.length;
}
const applySchema = z.object({
  quoteId: z.coerce.number().int().positive(), evaluationId: z.coerce.number().int().positive(),
  fxSnapshotId: z.number().int().positive().optional(),
  confirmed: z.boolean().refine((value) => value, "Confirm before applying"), fxRate: z.string().max(20), fxSource: z.string().max(1000), fxDate: z.string().max(30),
});
export async function applySourcingQuote(input: z.infer<typeof applySchema>) {
  const args = applySchema.parse(input);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340923)`;
    const quote = await tx.shippingQuote.findUniqueOrThrow({ where: { id: args.quoteId }, include: { variant: { include: { listing: true } }, market: true } });
    const evaluation = await tx.evaluation.findUniqueOrThrow({ where: { id: args.evaluationId } });
    if (quote.expiresAt <= new Date() || !quote.productObservedAt || Date.now() - quote.productObservedAt.getTime() >= FRESH_FOR_MS || !quote.variant.active) throw new Error("This quote is stale or the variant is no longer active. Refresh before applying.");
    if (evaluation.marketId !== quote.marketId || quote.market.countryCode !== quote.destinationCountry || evaluation.opportunityId !== quote.variant.listing.opportunityId) throw new Error("Quote, market and product do not match this evaluation.");
    if (quote.productPriceMinor === null) throw new Error("This variant has no exact product price; confirm it before applying.");
    let rate = "1", fxNote = "USD; no currency conversion";
    if (quote.market.currency !== "USD") {
      if (args.fxSnapshotId) {
        const snapshot = await tx.fxSnapshot.findUniqueOrThrow({ where: { id: args.fxSnapshotId } });
        if (snapshot.provider !== "NBG" || snapshot.currency !== quote.market.currency || !validRateDate(snapshot.rateDate)) throw new Error("FX snapshot currency or effective date is not valid for this evaluation.");
        rate = snapshot.rate;
        fxNote = `1 USD = ${rate} ${quote.market.currency}; official reference snapshot #${snapshot.id}, ${snapshot.provider}, effective ${snapshot.rateDate.toISOString().slice(0,10)}, ${snapshot.sourceUrl}; bank spread/fees not included`;
      } else {
        rate = args.fxRate;
        const url = sourceUrl.parse(args.fxSource);
        const dateText = z.iso.date().parse(args.fxDate), date = new Date(`${dateText}T00:00:00Z`);
        if (date > new Date() || Date.now() - date.getTime() > 7 * 86400000) throw new Error("Use an FX observation from the last seven days.");
        fxNote = `1 USD = ${rate} ${quote.market.currency}; manually supplied rate, ${dateText}, ${url}`;
      }
    }
    const supplier = convertUsdMinor(quote.productPriceMinor, rate), shipping = convertUsdMinor(quote.shippingMinor, rate);
    const note = `CJ estimate #${quote.id}, variant ${quote.variant.externalId}, one unit, ${quote.originCountry} to ${quote.destinationCountry} ${quote.postalCode}, ${quote.method}, shipping observed ${quote.observedAt.toISOString()}, product observed ${quote.productObservedAt.toISOString()}. ${fxNote}. Taxes/clearance must be reviewed separately.`;
    for (const [key, value] of [["supplierPrice", supplier], ["shippingToCustomer", shipping]] as const) {
      await tx.costInput.upsert({ where: { evaluationId_key: { evaluationId: evaluation.id, key } },
        create: { evaluationId: evaluation.id, key, value, status: "ESTIMATED", note }, update: { value, status: "ESTIMATED", note } });
    }
    // Explicit confirmation in the form covers these resets. A previous zero-duty
    // market default must not silently imply that an imported quote is tax free.
    for (const key of ["importDutyPct", "importDutyFixed"]) await tx.costInput.upsert({
      where: { evaluationId_key: { evaluationId: evaluation.id, key } },
      create: { evaluationId: evaluation.id, key, value: null, status: "UNKNOWN", note },
      update: { value: null, status: "UNKNOWN", note },
    });
    await tx.evaluation.update({ where: { id: evaluation.id }, data: { updatedAt: new Date() } });
    // Provider quotes are estimates, not observed delivery outcomes or demand.
    for (const kind of ["SOURCING", "SHIPPING"]) {
      const existing = await tx.evidence.findFirst({ where: { opportunityId: evaluation.opportunityId, marketId: evaluation.marketId, kind, summary: note.slice(0, 2000) } });
      if (!existing) await tx.evidence.create({ data: {
        opportunityId: evaluation.opportunityId, marketId: evaluation.marketId, kind, provenance: quote.market.currency === "USD" ? "PROVIDER_ESTIMATE" : "ASSUMPTION", outcome: "INCONCLUSIVE",
        summary: note.slice(0, 2000), url: quote.variant.listing.url,
        observedAt: kind === "SOURCING" ? quote.productObservedAt : quote.observedAt, expiresAt: quote.expiresAt,
      } });
    }
    return evaluation.opportunityId;
  }, { timeout: 20_000 });
}
