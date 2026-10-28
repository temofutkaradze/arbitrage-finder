import { z } from "zod";
// A provider amount must be an exact, nonnegative two-decimal USD amount.
export function usdMinor(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Math.round(Number(text) * 100);
  return Number.isSafeInteger(amount) && amount <= 2_000_000_000 ? amount : null;
}
export const countryCode = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use a two-letter country code");
export const originSchema = z.object({
  countryCode, totalInventory: z.number().int().nonnegative().nullable(),
  cjInventory: z.number().int().nonnegative().nullable(), factoryInventory: z.number().int().nonnegative().nullable(),
});
export const originsSchema = z.array(originSchema);
const quantity = z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number).pipe(z.number().int().nonnegative().max(2_000_000_000)).nullish();
const stockSchema = z.object({ countryCode, totalInventory: quantity, cjInventory: quantity, factoryInventory: quantity });
export function normalizeVariants(details: unknown, inventory: unknown, productId: string) {
  const product = z.object({ pid: z.string(), variants: z.array(z.object({
    vid: z.string().min(1).max(200), variantNameEn: z.string().max(500).nullish(), variantSku: z.string().max(200).nullish(),
    variantSellPrice: z.unknown().optional(),
  })).max(1000) }).parse(details);
  if (product.pid !== productId) throw new Error("CJ product identity mismatch");
  const stock = z.object({ variantInventories: z.array(z.object({ vid: z.string(), inventory: z.array(stockSchema).nullish() })).max(1000) }).parse(inventory);
  const ids = new Set<string>();
  return product.variants.map((v) => {
    if (ids.has(v.vid)) throw new Error("CJ duplicate variant identity"); ids.add(v.vid);
    const origins = stock.variantInventories.filter((s) => s.vid === v.vid).flatMap((s) => s.inventory ?? []).map((s) => ({
      countryCode: s.countryCode, totalInventory: s.totalInventory ?? null, cjInventory: s.cjInventory ?? null, factoryInventory: s.factoryInventory ?? null,
    }));
    return { externalId: v.vid, name: v.variantNameEn || v.variantSku || v.vid, sku: v.variantSku ?? null,
      priceMinor: usdMinor(v.variantSellPrice), origins };
  });
}
const freightSchema = z.array(z.object({
  logisticName: z.string().min(1).max(200), logisticPrice: z.unknown().optional(), logisticAging: z.string().max(100).nullish(),
  taxesFee: z.unknown().optional(), clearanceOperationFee: z.unknown().optional(), totalPostageFee: z.unknown().optional(),
})).max(100);
export function normalizeFreight(data: unknown) {
  return freightSchema.parse(data).map((row) => {
    const shippingMinor = usdMinor(row.logisticPrice);
    if (shippingMinor === null) throw new Error("CJ shipping price is missing or not an exact USD amount");
    return { method: row.logisticName, shippingMinor, deliveryEstimate: row.logisticAging ?? null,
      taxesMinor: usdMinor(row.taxesFee), clearanceMinor: usdMinor(row.clearanceOperationFee), totalPostageMinor: usdMinor(row.totalPostageFee) };
  });
}
export const quoteRequestSchema = z.object({
  variantId: z.coerce.number().int().positive(), marketId: z.coerce.number().int().positive(), originCountry: countryCode,
  postalCode: z.string().trim().min(1).max(20).regex(/^[A-Za-z0-9 -]+$/, "Use a postal code without personal address details"),
});
