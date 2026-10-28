import { describe, expect, it } from "vitest";
import { calculate } from "./calculate";
import type { InputKey, Inputs } from "./types";

const v = (value: number, status: "VERIFIED" | "ESTIMATED" = "VERIFIED") => ({ value, status });
// $100 price, $40 supplier, $10 shipping, no duty/tax, 3% + $0.30 fees, 5% returns losing $30, $20 ads
const base = (): Inputs => ({
  sellingPrice: v(10000), supplierPrice: v(4000), shippingToCustomer: v(1000), importDutyPct: v(0),
  taxRate: v(0), paymentFeePct: v(300), paymentFeeFixed: v(30), returnRatePct: v(500),
  returnCostPerReturn: v(3000), cac: v(2000),
});
const done = (i: Inputs, inc = false) => {
  const r = calculate(i, { pricesIncludeTax: inc });
  if (!r.complete) throw new Error("expected complete: " + r.missing.join(","));
  return r;
};

describe("calculate", () => {
  it("computes a verified result by hand-checked arithmetic", () => {
    const r = done(base());
    // fees 300+30=330, returns 5%*3000=150, costs before ads=4000+1000+330+150=5480
    expect(r.contributionBeforeAds).toBe(10000 - 5480);
    expect(r.netProfit).toBe(4520 - 2000);
    expect(r.margin).toBeCloseTo(0.252, 3);
    expect(r.maxAffordableCac).toBe(4520);
    expect(r.breakEvenRoas).toBeCloseTo(10000 / 4520, 5);
    expect(r.roi).toBeCloseTo(2520 / (5000 + 2000), 5);
    expect(r.quality).toBe("estimated"); // optional inputs unknown -> assumed zero, flagged
    expect(r.assumedZero).toContain("otherCosts");
  });

  it("is verified only when no optional input was assumed", () => {
    const i = base();
    for (const k of ["shippingCharged", "importDutyFixed", "shopifyFeePct", "chargebackRatePct", "chargebackCost", "damagePct", "otherCosts", "batchUnits"] as InputKey[]) i[k] = v(0);
    expect(done(i).quality).toBe("verified");
  });

  it("marks estimates", () => {
    const i = base(); i.cac = v(2000, "ESTIMATED");
    expect(done(i).estimatedKeys).toEqual(["cac"]);
  });

  it("refuses to produce profit when essentials are missing or UNKNOWN", () => {
    const i = base(); delete i.supplierPrice; i.cac = { value: 2000, status: "UNKNOWN" };
    const r = calculate(i, { pricesIncludeTax: false });
    expect(r.complete).toBe(false);
    if (!r.complete) expect(r.missing).toEqual(["supplierPrice", "cac"]);
  });

  it("treats UNKNOWN status as missing even if a number is present", () => {
    const i = base(); i.taxRate = { value: 2000, status: "UNKNOWN" };
    expect(calculate(i, { pricesIncludeTax: true }).complete).toBe(false);
  });

  it("handles tax-inclusive prices (20% VAT)", () => {
    const i = base(); i.taxRate = v(2000);
    const r = done(i, true);
    expect(r.revenue).toBe(8333);
    expect(r.taxCollected).toBe(10000 - 8333);
    expect(r.grossCollected).toBe(10000);
  });

  it("handles tax-exclusive prices (fees apply to gross incl. tax)", () => {
    const i = base(); i.taxRate = v(1000);
    const r = done(i, false);
    expect(r.revenue).toBe(10000);
    expect(r.grossCollected).toBe(11000);
    expect(r.lines.find((l) => l.label.startsWith("Payment"))!.amount).toBe(-(330 + 30));
  });

  it("applies import duty to supplier price + shipping, plus fixed duty", () => {
    const i = base(); i.importDutyPct = v(1000); i.importDutyFixed = v(300);
    expect(done(i).landedCost).toBe(4000 + 1000 + 500 + 300);
  });

  it("break-even price yields ~zero profit (tax-inclusive, with %-fees)", () => {
    const i = base(); i.taxRate = v(2000); i.shopifyFeePct = v(200);
    const r = done(i, true);
    const at = done({ ...i, sellingPrice: v(r.breakEvenPrice!) }, true);
    expect(at.netProfit).toBeGreaterThanOrEqual(0);
    expect(at.netProfit).toBeLessThan(5);
    const below = done({ ...i, sellingPrice: v(r.breakEvenPrice! - 20) }, true);
    expect(below.netProfit).toBeLessThan(0);
  });

  it("break-even price is null when % fees consume all revenue", () => {
    const i = base(); i.paymentFeePct = v(10000);
    expect(done(i).breakEvenPrice).toBeNull();
  });

  it("reports losses honestly and nulls ROAS", () => {
    const i = base(); i.cac = v(9000);
    const r = done(i);
    expect(r.netProfit).toBeLessThan(0);
    const j = base(); j.supplierPrice = v(9500);
    expect(done(j).breakEvenRoas).toBeNull();
  });

  it("scenarios keep everything but ad cost fixed", () => {
    const r = done(base());
    const noAds = r.scenarios.find((s) => s.label === "No ad cost")!;
    expect(noAds.netProfit).toBe(r.contributionBeforeAds);
    expect(r.scenarios.find((s) => s.label === "Current estimate")!.netProfit).toBe(r.netProfit);
    expect(r.scenarios.find((s) => s.label.includes("30%"))!.cac).toBe(3000);
  });

  it("a $200 item can out-earn a $10 item per order", () => {
    const big = base(); big.sellingPrice = v(35000); big.supplierPrice = v(20000);
    const small = base(); small.sellingPrice = v(2000); small.supplierPrice = v(1000); small.shippingToCustomer = v(300);
    expect(done(big).netProfit).toBeGreaterThan(done(small).netProfit);
  });

  it("never shows negative zero in the breakdown", () => {
    for (const l of done(base()).lines) expect(Object.is(l.amount, -0)).toBe(false);
  });

  it("computes batch capital only when units are known", () => {
    expect(done(base()).batchCapital).toBeNull();
    const i = base(); i.batchUnits = v(10);
    expect(done(i).batchCapital).toBe(5000 * 10);
  });
});
