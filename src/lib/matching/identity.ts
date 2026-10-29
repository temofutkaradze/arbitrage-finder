import { z } from "zod";
import { sourceUrl } from "../discovery/schema";

// Keep punctuation: AB-12 and AB12 are not necessarily the same model.
export function identifierText(value: string): string | null {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toUpperCase() || null;
}

export function canonicalGtin(value: string): string | null {
  const digits = value.trim();
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits) || /^0+$/.test(digits)) return null;
  let sum = 0;
  for (let i = digits.length - 2, weight = 3; i >= 0; i--, weight = 4 - weight) sum += Number(digits[i]) * weight;
  if ((10 - sum % 10) % 10 !== Number(digits.at(-1))) return null;
  return digits.padStart(14, "0");
}

const optionalText = z.string().max(200).transform(identifierText);
export const identitySchema = z.object({
  gtin: z.string().trim().max(14).refine(s => !s || canonicalGtin(s) !== null, "GTIN needs 8, 12, 13 or 14 digits and a valid check digit").transform(s => s ? canonicalGtin(s) : null),
  brand: optionalText,
  mpn: optionalText,
  packUnits: z.union([z.literal("").transform(() => null), z.coerce.number().int().min(1).max(10000)]),
  variantKey: optionalText,
  sourceUrl,
  observedAt: z.iso.datetime({ offset: true }).transform(s => new Date(s)),
  note: z.string().trim().min(20).max(2000),
}).strict().refine(v => v.gtin || (v.brand && v.mpn), "Enter a valid GTIN or both brand and manufacturer part number");
export type IdentityInput = z.infer<typeof identitySchema>;
export type Identity = Pick<IdentityInput, "gtin" | "brand" | "mpn" | "packUnits" | "variantKey">;
export type Comparison = { basis: string | null; blockers: string[]; missing: string[]; ready: boolean };

export function compareIdentity(a: Identity, b: Identity): Comparison {
  const blockers: string[] = [], missing: string[] = [];
  const basis = a.gtin && a.gtin === b.gtin ? "Same GTIN" : a.brand && a.mpn && a.brand === b.brand && a.mpn === b.mpn ? "Same brand and manufacturer part number" : null;
  for (const key of ["gtin", "brand", "mpn", "packUnits", "variantKey"] as const) {
    if (a[key] !== null && b[key] !== null && a[key] !== b[key]) blockers.push(`Conflicting ${key}`);
  }
  if (a.packUnits === null || b.packUnits === null) missing.push("Record pack units on both listings");
  if (a.variantKey === null || b.variantKey === null) missing.push("Record exact variant specifications on both listings (or explicitly STANDARD if no variants)");
  return { basis, blockers, missing, ready: !!basis && !blockers.length && !missing.length };
}
