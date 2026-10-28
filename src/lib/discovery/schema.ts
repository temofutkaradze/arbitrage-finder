import { z } from "zod";

// V1 only supports two-decimal currencies, matching the existing calculator.
export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "GEL"] as const;
export const sourceUrl = z.string().trim().max(1000).url().refine((s) => {
  const u = new URL(s);
  return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password;
}, "Use an HTTP(S) source URL without credentials");
export const listingSchema = z.object({
  provider: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,40}$/),
  externalId: z.string().trim().min(1).max(200),
  variantId: z.string().trim().max(200).default(""),
  name: z.string().trim().min(1).max(200),
  url: sourceUrl,
  currency: z.enum(CURRENCIES),
  priceMinor: z.number().int().min(0).max(2_000_000_000).nullable(),
  observedAt: z.iso.datetime({ offset: true }).transform((s) => new Date(s)),
});
export type ListingInput = z.infer<typeof listingSchema>;
export function parseImport(text: string, now = new Date()): ListingInput[] {
  if (Buffer.byteLength(text, "utf8") > 250_000) throw new Error("Import is limited to 250 KB");
  const rows = z.array(listingSchema).min(1).max(100).parse(JSON.parse(text));
  const keys = new Set<string>();
  for (const row of rows) {
    if (row.observedAt.getTime() > now.getTime()) throw new Error("Observation dates cannot be in the future");
    const key = JSON.stringify([row.provider, row.externalId, row.variantId]);
    if (keys.has(key)) throw new Error("Duplicate source/product/variant in this import");
    keys.add(key);
  }
  return rows;
}
