import { INPUT_DEFS, type CalcResult, type DataStatus, type InputKey, type Inputs, type Line, type MarketSettings } from "./types";
import { buildScenarios } from "./scenarios";

const BP = 10000;

/**
 * Pure, deterministic profit model. Money in minor units, rates in basis points.
 * If any essential input is UNKNOWN the result is incomplete: no profit number is produced.
 */
export function calculate(inputs: Inputs, market: MarketSettings): CalcResult {
  const known = (k: InputKey) => {
    const v = inputs[k];
    return !!v && v.status !== "UNKNOWN" && v.value !== null && v.value !== undefined && Number.isFinite(v.value);
  };
  const missing = INPUT_DEFS.filter((d) => d.essential && !known(d.key)).map((d) => d.key);
  if (missing.length) return { complete: false, missing, quality: "incomplete" };

  const n = (k: InputKey) => (known(k) ? (inputs[k]!.value as number) : 0);
  const assumedZero = INPUT_DEFS.filter((d) => !d.essential && !known(d.key)).map((d) => d.key);
  const estimatedKeys = INPUT_DEFS.filter((d) => known(d.key) && inputs[d.key]!.status === "ESTIMATED").map((d) => d.key);
  const st = (k: InputKey): DataStatus => (known(k) ? inputs[k]!.status : "UNKNOWN");
  const r = Math.round;

  const s = n("sellingPrice") + n("shippingCharged");
  const tax = n("taxRate");
  const inc = market.pricesIncludeTax;
  const revenue = inc ? r((s * BP) / (BP + tax)) : s;
  const taxCollected = inc ? s - revenue : r((s * tax) / BP);
  const grossCollected = inc ? s : s + taxCollected;

  const supplier = n("supplierPrice");
  const ship = n("shippingToCustomer");
  const duty = r(((supplier + ship) * n("importDutyPct")) / BP) + n("importDutyFixed");
  const payFee = r((grossCollected * n("paymentFeePct")) / BP) + n("paymentFeeFixed");
  const shopFee = r((grossCollected * n("shopifyFeePct")) / BP);
  const returns = r((n("returnRatePct") * n("returnCostPerReturn")) / BP);
  const chargebacks = r((n("chargebackRatePct") * n("chargebackCost")) / BP);
  const damage = r((supplier * n("damagePct")) / BP);
  const other = n("otherCosts");
  const cac = n("cac");

  const landedCost = supplier + ship + duty;
  const costsBeforeAds = landedCost + payFee + shopFee + returns + chargebacks + damage + other;
  const contributionBeforeAds = revenue - costsBeforeAds;
  const netProfit = contributionBeforeAds - cac;
  const totalCost = costsBeforeAds + cac;
  const capitalPerOrder = landedCost + cac;

  // Break-even selling price: solve profit(price)=0 where revenue and %-fees scale with price.
  const g = inc ? 1 : 1 + tax / BP;
  const dd = inc ? 1 + tax / BP : 1;
  const feePct = (n("paymentFeePct") + n("shopifyFeePct")) / BP;
  const denom = 1 / dd - g * feePct;
  const fixed = landedCost + n("paymentFeeFixed") + returns + chargebacks + damage + other + cac;
  const breakEvenPrice = denom > 0 ? Math.ceil(fixed / denom - n("shippingCharged")) : null;

  const L = (label: string, amount: number, status: DataStatus | "CALCULATED"): Line => ({ label, amount: amount === 0 ? 0 : amount, status }); // avoids -0
  const lines: Line[] = [
    L("Revenue excluding tax (price + shipping charged)", revenue, st("sellingPrice")),
    L("Supplier product price", -supplier, st("supplierPrice")),
    L("Shipping cost to customer", -ship, st("shippingToCustomer")),
    L("Import duty and handling", -duty, st("importDutyPct")),
    L("Payment processing fees", -payFee, st("paymentFeePct")),
    L("Shopify transaction fee", -shopFee, st("shopifyFeePct")),
    L("Expected return losses", -returns, st("returnRatePct")),
    L("Expected chargeback losses", -chargebacks, st("chargebackRatePct")),
    L("Damaged-item allowance", -damage, st("damagePct")),
    L("Other costs", -other, st("otherCosts")),
    L("Advertising cost per order", -cac, st("cac")),
  ];

  return {
    complete: true,
    quality: estimatedKeys.length || assumedZero.length ? "estimated" : "verified",
    assumedZero, estimatedKeys, revenue, taxCollected, grossCollected,
    landedCost, costsBeforeAds, totalCost, contributionBeforeAds, netProfit,
    margin: revenue > 0 ? netProfit / revenue : null,
    roi: capitalPerOrder > 0 ? netProfit / capitalPerOrder : null,
    maxAffordableCac: contributionBeforeAds,
    breakEvenRoas: contributionBeforeAds > 0 ? revenue / contributionBeforeAds : null,
    breakEvenPrice, capitalPerOrder,
    batchCapital: known("batchUnits") ? landedCost * n("batchUnits") : null,
    lines, scenarios: buildScenarios(contributionBeforeAds, revenue, cac),
  };
}
