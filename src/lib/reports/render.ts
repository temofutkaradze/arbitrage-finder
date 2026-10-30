import type { ReportData } from "./data";
import { calculate } from "../profit/calculate";
import { calculateBeforeAds } from "../profit/before-ads";
import { INPUT_DEFS, type Inputs } from "../profit/types";
import { researchReadiness } from "../research/readiness";

// Plain text attachment, never HTML/CSV. Indent and label untrusted source text;
// strip terminal/control characters so notes cannot overwrite report headings.
const text = (s: string | null | undefined) => (s ?? "Unknown").replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "").replace(/\r\n?/g, "\n").replace(/\n/g, "\n    ");
const money = (n: number, currency: string) => `${currency} ${(n / 100).toFixed(2)}`;
const labels = (keys: readonly string[]) => keys.map(k => INPUT_DEFS.find(d => d.key === k)?.label ?? k).join("; ") || "None";
export function renderReport(data: ReportData, now = new Date()): string {
  const out: string[] = ["ARBITRAGE FINDER — RESEARCH SNAPSHOT v2", `Generated UTC: ${now.toISOString()}`, `Research ID: ${data.id}`, `Product: ${text(data.name)}`, `Sample: ${data.isSample ? "YES — illustrative fixture" : "No"}`, `Category: ${text(data.category)}`, `Source: ${text(data.sourceName)}`, `Source URL: ${text(data.sourceUrl)}`, `Notes: ${text(data.notes)}`, "",
    "LIMITATIONS", "Research inputs and source claims are not independently certified. VERIFIED is an operator status, not an audit.", "Contribution after ads excludes fixed overhead and business income tax. It is not guaranteed profit or demand.", "Calculator simplifications: import VAT is not modeled separately; duty is applied to supplier price plus shipping; unrecovered return costs must be entered.", "Currencies are reported separately; no cross-market totals or new FX conversions are performed.", "Unknown essential costs prevent an after-ad result. Unknown optional costs may be counted as zero and are listed.", "Supplier prices are catalogue indications. No fresh provider request, order, publication or ad spend occurs.", "This snapshot includes current inputs, linked catalogue identities, all recorded evidence and competitor observations within export limits.", "It includes saved variants, stock reports and shipping quote snapshots. It excludes unreviewed provider offers, catalogue price history, financial edit history, AI reports and matching audit history. It is not a database backup.", "Recorded notes and URLs may contain private business information; review before sharing.", ""];
  out.push("MARKET EVALUATIONS");
  if (!data.evaluations.length) out.push("No market evaluations. Financial results remain unknown; no commercial market is selected by this report.");
  for (const e of data.evaluations) {
    const inputs: Inputs = Object.fromEntries(e.inputs.map(i => [i.key, { value: i.value, status: i.status, note: i.note }]));
    const settings = { pricesIncludeTax: e.market.pricesIncludeTax }, c = calculate(inputs, settings), readiness = researchReadiness(data.evidence, e.marketId, now), cur = e.market.currency;
    out.push("", `Market: ${text(e.market.code)} — ${text(e.market.name)} [${cur}]`, `Destination: ${text(e.market.countryCode)}`, `Evaluation updated UTC: ${e.updatedAt.toISOString()}`, `Prices include tax: ${settings.pricesIncludeTax ? "Yes" : "No"}`, `Research: ${readiness.label}`, `Next: ${readiness.next}`, `Missing evidence: ${readiness.missing.join(", ") || "None"}`);
    if (!c.complete) {
      out.push("Contribution after ads: UNKNOWN", `Missing essential inputs: ${labels(c.missing)}`);
      const before = calculateBeforeAds(inputs, settings);
      if (before) out.push(`Contribution before ads (not an ad forecast): ${money(before.contribution, cur)}`, `Before-ad optional inputs assumed zero: ${labels(before.assumedZero)}`, `Before-ad estimated inputs: ${labels(before.estimatedKeys)}`);
    } else {
      out.push(`Calculation quality: ${c.quality} (input status only)`, `Contribution before ads / order: ${money(c.contributionBeforeAds, cur)}`, `Contribution after ads / order: ${money(c.netProfit, cur)}`, `Margin: ${c.margin === null ? "n/a" : (c.margin * 100).toFixed(1) + "%"}`, `Break-even CAC: ${c.maxAffordableCac > 0 ? money(c.maxAffordableCac, cur) : "No positive advertising budget"}`, `Break-even ROAS: ${c.breakEvenRoas === null ? "n/a" : c.breakEvenRoas.toFixed(2) + "x"}`, `Optional inputs assumed zero: ${labels(c.assumedZero)}`, `Estimated inputs: ${labels(c.estimatedKeys)}`, "Breakdown per order:");
      for (const line of c.lines) out.push(`  ${line.label}: ${money(line.amount, cur)} [${line.status}]`);
      out.push("Advertising-cost scenarios (assumptions, not forecasts):");
      for (const scenario of c.scenarios) out.push(`  ${scenario.label}: CAC ${money(scenario.cac, cur)}; after-ad contribution ${money(scenario.netProfit, cur)}`);
    }
    out.push("Stored inputs (unknown values are not usable estimates):");
    for (const def of INPUT_DEFS) {
      const i = inputs[def.key], value = i?.value;
      out.push(`  ${def.label}: ${value == null ? "Unknown" : def.unit === "money" ? money(value, cur) : def.unit === "percent" ? (value / 100).toFixed(2) + "%" : String(value)} [${i?.status ?? "UNKNOWN"}]`, `    Note: ${text(i?.note)}`);
    }
  }
  out.push("", "LINKED SUPPLIER LISTINGS");
  if (!data.listings.length) out.push("None recorded.");
  for (const l of data.listings) {
    out.push(`Listing #${l.id}: ${text(l.name)}`, `  Provider: ${text(l.provider)}; product: ${text(l.externalId)}; variant: ${text(l.variantId || null)}; origin: ${text(l.importedVia)}`, `  URL: ${text(l.url)}`, `  Catalogue price: ${l.priceMinor === null ? "Unknown / range" : money(l.priceMinor, l.currency)}; observed UTC: ${l.observedAt.toISOString()}`);
    if (l.identity) out.push(`  Operator identity revision: ${l.identity.revision}; GTIN: ${text(l.identity.gtin)}; brand: ${text(l.identity.brand)}; MPN: ${text(l.identity.mpn)}`, `  Pack units: ${l.identity.packUnits ?? "Unknown"}; variant: ${text(l.identity.variantKey)}`, `  Identity source: ${text(l.identity.sourceUrl)}; observed UTC: ${l.identity.observedAt.toISOString()}`, `  Identity note: ${text(l.identity.note)}`);
    else out.push("  Product identifiers not recorded.");
  }
  out.push("", "SUPPLIER VARIANTS AND STOCK REPORTS", "Provider reports are not reserved inventory. Inactive variants and expired quotes are retained as historical data.");
  if(!data.supplierVariants.length)out.push("None recorded. Refresh supplier variants in Discovery if needed.");
  for(const v of data.supplierVariants)out.push(`Variant #${v.id}; listing #${v.listingId}: ${text(v.externalId)}; SKU: ${text(v.sku)}; ${v.active?"ACTIVE":"INACTIVE"}`,`  Name: ${text(v.name)}; catalogue price USD: ${v.priceMinor===null?"Unknown":(v.priceMinor/100).toFixed(2)}`,`  Observed UTC: ${v.observedAt.toISOString()}`,`  Stock report JSON: ${text(JSON.stringify(v.origins))}`);
  out.push("", "SAVED SHIPPING QUOTES", "One unit per quote; no freshness guarantee or tax exemption follows from provider zero values.");
  if(!data.shippingQuotes.length)out.push("None recorded. Delivered supplier cost remains unconfirmed.");
  for(const q of data.shippingQuotes)out.push(`Quote #${q.id}; variant #${q.variantId}; market #${q.marketId} ${text(q.market.code)}`,`  Route: ${text(q.originCountry)} to ${text(q.destinationCountry)} ${text(q.postalCode)}; current market destination: ${text(q.market.countryCode)}`,`  Method: ${text(q.method)}; delivery text: ${text(q.deliveryEstimate)}`,`  Product: ${q.productPriceMinor===null?"Unknown":money(q.productPriceMinor,"USD")}; shipping: ${money(q.shippingMinor,"USD")}`,`  Taxes: ${q.taxesMinor===null?"Unknown":money(q.taxesMinor,"USD")}; clearance: ${q.clearanceMinor===null?"Unknown":money(q.clearanceMinor,"USD")}; total postage: ${q.totalPostageMinor===null?"Unknown":money(q.totalPostageMinor,"USD")}`,`  Product observed UTC: ${q.productObservedAt?.toISOString()??"Unknown"}; quote observed UTC: ${q.observedAt.toISOString()}; expires UTC: ${q.expiresAt.toISOString()}; ${q.expiresAt<=now?"EXPIRED":"Within recorded expiry; review product freshness, active variant and destination before use"}`);
  out.push("", "RESEARCH EVIDENCE (includes expired and retired records)");
  if (!data.evidence.length) out.push("None recorded. Demand and fulfilment are not established.");
  for (const e of data.evidence) out.push(`Evidence #${e.id}: ${text(e.kind)}; ${text(e.provenance)}; ${text(e.outcome)}; ${e.resolvedAt ? "RETIRED" : e.expiresAt <= now ? "EXPIRED" : "Current by recorded expiry"}`, `  Scope: ${e.market ? text(e.market.code) : "Global"}`, `  Summary: ${text(e.summary)}`, `  URL: ${text(e.url)}`, `  Observed UTC: ${e.observedAt.toISOString()}; expires UTC: ${e.expiresAt.toISOString()}`, `  Retirement: ${e.resolvedAt?.toISOString() ?? "Not retired"}; reason: ${text(e.resolutionNote)}`);
  out.push("", "RECORDED COMPETITOR OBSERVATIONS", "Displayed offers do not establish sales, market-wide competition, or a recommended selling price.");
  if (!data.competitors.length) out.push("None recorded.");
  for (const c of data.competitors) out.push(`Observation #${c.id}: ${text(c.merchant)}; market: ${text(c.market.code)}; match: ${text(c.match)}; ${c.expiresAt <= now ? "EXPIRED" : "Current by recorded expiry"}`, `  Product: ${money(c.priceMinor, c.currency)}; shipping: ${c.shippingMinor === null ? "Unknown" : money(c.shippingMinor, c.currency)}; tax basis: ${text(c.taxBasis)}`, `  Comparison: ${text(c.comparison)}`, `  URL: ${text(c.url)}`, `  Observed UTC: ${c.observedAt.toISOString()}; expires UTC: ${c.expiresAt.toISOString()}`);
  return out.join("\n") + "\n";
}
