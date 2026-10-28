import { describe, it, expect } from "vitest";
import { parseCsv, normalizeCjResponse } from "./products";
describe("discovery normalization", () => {
  it("normalizes documented CJ V2 fields", () => {
    const found = normalizeCjResponse({ code: 200, result: true, data: { content: [{ productList: [
      { id: "p1", nameEn: "Item", nowPrice: "9.50", sellPrice: "11.85", threeCategoryName: "Home" }
    ] }] } });
    expect(found).toMatchObject([{ source: "CJ", externalId: "p1", name: "Item", price: 9.5, currency: "USD" }]);
  });
  it("deduplicates by source ID", () => {
    const items = parseCsv("externalId,name,price,currency,category,sourceUrl\na,One,1,USD,Home,\na,Two,2,USD,Home,");
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Two");
  });
  it("accepts quoted commas", () => {
    expect(parseCsv('externalId,name,price,currency,category,sourceUrl\na,"Tool, mini",2.50,USD,Home,')[0].name).toBe("Tool, mini");
  });
  it("rejects malformed prices", () => {
    expect(() => parseCsv("externalId,name,price,currency,category,sourceUrl\na,Item,abc,USD,Home,")).toThrow();
  });
  it("does not accept failed responses", () => {
    expect(() => normalizeCjResponse({ code: 429, result: false })).toThrow();
  });
});
