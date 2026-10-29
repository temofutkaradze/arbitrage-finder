import { describe, expect, it } from "vitest";
import { renderReport } from "./render";
import { assertReportLimits } from "./policy";
import type { ReportData } from "./data";
import { INPUT_DEFS } from "../profit/types";
const now = new Date("2026-10-29T10:00:00Z");
const market = { version: 0, id: 1, code: "TEST", name: "Technical fixture", currency: "USD", countryCode: null, pricesIncludeTax: false, assumptions: {}, createdAt: now, updatedAt: now };
function fixture(): ReportData {
  return { id: 1, name: "Test product", category: null, sourceName: null, sourceUrl: null, notes: null, isSample: true, createdAt: now, updatedAt: now, listings: [], evidence: [], competitors: [], evaluations: [{ version: 0, id: 1, opportunityId: 1, marketId: 1, createdAt: now, updatedAt: now, market,
    inputs: INPUT_DEFS.filter(d => d.essential).map((d, index) => ({ id: index+1, evaluationId: 1, key: d.key, value: d.key === "sellingPrice" ? 10000 : d.key === "supplierPrice" ? 2000 : d.key === "shippingToCustomer" ? 300 : d.key === "cac" ? 1000 : 0, status: "ESTIMATED", note: "Fixture assumption", updatedAt: now })) }] };
}
describe("research export", () => {
  it("reports calculated contribution and zero assumptions without claiming certified profit", () => {
    const report = renderReport(fixture(), now);
    expect(report).toContain("Contribution after ads / order: USD 67.00");
    expect(report).toContain("Optional inputs assumed zero: Shipping charged to customer");
    expect(report).toContain("Calculation quality: estimated");
    expect(report).toContain("excludes fixed overhead");
    expect(report).toContain("Sample: YES");
  });
  it("keeps after-ad result unknown when CAC is missing while labelling before-ad contribution", () => {
    const data = fixture(); data.evaluations[0].inputs = data.evaluations[0].inputs.filter(i => i.key !== "cac");
    const report = renderReport(data, now);
    expect(report).toContain("Contribution after ads: UNKNOWN");
    expect(report).toContain("Missing essential inputs: Advertising cost per order");
    expect(report).toContain("Contribution before ads (not an ad forecast): USD 77.00");
    expect(report).not.toContain("Advertising-cost scenarios");
  });
  it("keeps market currencies separate and handles products without evaluations", () => {
    const data = fixture(); data.evaluations.push({ ...data.evaluations[0], id: 2, marketId: 2, market: { ...market, id: 2, code: "EU", currency: "EUR" } });
    const report = renderReport(data, now); expect(report).toContain("USD 67.00"); expect(report).toContain("EUR 67.00");
    data.evaluations = []; expect(renderReport(data, now)).toContain("No market evaluations. Financial results remain unknown");
  });
  it("preserves expiry, retirement and provenance without letting notes impersonate headings", () => {
    const data = fixture(); data.notes = "Stored note\r\nFAKE HEADING\u001b[2J";
    data.evidence = [{ id: 1, opportunityId: 1, marketId: null, market: null, kind: "DEMAND", provenance: "ASSUMPTION", outcome: "SUPPORTS", summary: "Not observed demand", url: "https://example.com", observedAt: now, expiresAt: new Date(0), resolvedAt: null, resolutionNote: null, createdAt: now }, { id: 2, opportunityId: 1, marketId: null, market: null, kind: "SHIPPING", provenance: "PROVIDER_ESTIMATE", outcome: "SUPPORTS", summary: "Retired estimate", url: "https://example.com", observedAt: now, expiresAt: new Date("2027-01-01"), resolvedAt: now, resolutionNote: "Superseded source", createdAt: now }];
    const report = renderReport(data, now); expect(report).toContain("ASSUMPTION; SUPPORTS; EXPIRED"); expect(report).toContain("PROVIDER_ESTIMATE; SUPPORTS; RETIRED"); expect(report).toContain("Needs research"); expect(report).toContain("\n    FAKE HEADING"); expect(report).not.toContain("\u001b");
  });
  it("fails closed at each export bound instead of returning partial research", () => {
    const lengths = { evaluations: { length: 100 }, evidence: { length: 2000 }, listings: { length: 500 }, competitors: { length: 2000 } };
    expect(() => assertReportLimits(lengths)).not.toThrow();
    for (const key of Object.keys(lengths) as (keyof typeof lengths)[]) expect(() => assertReportLimits({ ...lengths, [key]: { length: lengths[key].length + 1 } })).toThrow("No partial report");
  });
});
