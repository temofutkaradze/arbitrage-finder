import { describe, expect, it } from "vitest";
import { canonicalGtin, identifierText, identitySchema, compareIdentity, type Identity } from "./identity";
const a: Identity = { gtin: "00036000291452", brand: "ACME", mpn: "AB-12", packUnits: 1, variantKey: "BLUE / 10 CM" };
describe("sourced product identity", () => {
  it("validates 8/12/13/14 digits and canonicalizes UPC/EAN without losing zeros", () => {
    expect(canonicalGtin("036000291452")).toBe("00036000291452");
    expect(canonicalGtin("0036000291452")).toBe("00036000291452");
    expect(canonicalGtin("96385074")).toBe("00000096385074");
    expect(canonicalGtin("10012345000017")).toBe("10012345000017");
    for (const value of ["036000291453", "00000000", "ABC12345", "036-000291452", "123456", "١٢٣٤٥٦٧٨"]) expect(canonicalGtin(value)).toBeNull();
  });
  it("normalizes case and whitespace but preserves meaningful model punctuation", () => {
    expect(identifierText(" Ａcme   Tools ")).toBe("ACME TOOLS");
    expect(identifierText("AB-12")).not.toBe(identifierText("AB12"));
  });
  it("requires source-backed identifiers rather than a title or warehouse SKU", () => {
    const base = { gtin: "", brand: "", mpn: "", packUnits: "", variantKey: "", sourceUrl: "https://example.com", observedAt: "2026-10-29T00:00:00Z", note: "Observed identifiers in supplier documentation." };
    expect(identitySchema.safeParse(base).success).toBe(false);
    expect(identitySchema.parse({ ...base, brand: "Acme", mpn: "AB-12" }).packUnits).toBeNull();
    expect(identitySchema.safeParse({ ...base, gtin: "036000291453" }).success).toBe(false);
    expect(identitySchema.safeParse({ ...base, gtin: "036000291452", sourceUrl: "https://user:password@example.com" }).success).toBe(false);
    expect(identitySchema.safeParse({ ...base, brand: "Acme", mpn: "AB-12", packUnits: "0" }).success).toBe(false);
  });
  it("accepts exact GTIN or brand/MPN only with known matching pack and variant", () => {
    expect(compareIdentity(a, { ...a }).ready).toBe(true);
    expect(compareIdentity({ ...a, gtin: null }, { ...a, gtin: null }).ready).toBe(true);
    expect(compareIdentity({ ...a, gtin: null, mpn: "AB12" }, { ...a, gtin: null }).basis).toBeNull();
    for (const key of ["packUnits", "variantKey"] as const) expect(compareIdentity(a, { ...a, [key]: null }).ready).toBe(false);
  });
  it("blocks contradictory identifiers even when another identifier matches", () => {
    for (const change of [{ gtin: "04006381333931" }, { brand: "OTHER" }, { mpn: "OTHER" }, { packUnits: 2 }, { variantKey: "RED / 10 CM" }]) {
      const comparison = compareIdentity(a, { ...a, ...change });
      expect(comparison.ready).toBe(false); expect(comparison.blockers.length).toBeGreaterThan(0);
    }
  });
});
