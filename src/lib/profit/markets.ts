import type { InputKey } from "./types";
/** Inputs that can carry a market-level default. The rest are product-specific. */
export const MARKET_KEYS: InputKey[] = [
  "shippingCharged", "importDutyPct", "importDutyFixed", "taxRate", "paymentFeePct", "paymentFeeFixed",
  "shopifyFeePct", "returnRatePct", "returnCostPerReturn", "chargebackRatePct", "chargebackCost", "damagePct", "otherCosts", "cac",
];
