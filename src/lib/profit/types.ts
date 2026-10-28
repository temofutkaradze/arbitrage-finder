export type DataStatus = "VERIFIED" | "ESTIMATED" | "UNKNOWN";
export type Unit = "money" | "percent" | "count";

// money = minor units (cents), percent = basis points (2.9% = 290), count = whole number
export const INPUT_DEFS = [
  { key: "sellingPrice", label: "Selling price (customer pays)", unit: "money", essential: true },
  { key: "shippingCharged", label: "Shipping charged to customer", unit: "money", essential: false },
  { key: "supplierPrice", label: "Supplier product price", unit: "money", essential: true },
  { key: "shippingToCustomer", label: "Shipping cost to customer (per order)", unit: "money", essential: true },
  { key: "importDutyPct", label: "Import duty %", unit: "percent", essential: true },
  { key: "importDutyFixed", label: "Fixed import duty/handling per order", unit: "money", essential: false },
  { key: "taxRate", label: "VAT / sales tax rate", unit: "percent", essential: true },
  { key: "paymentFeePct", label: "Payment processing fee %", unit: "percent", essential: true },
  { key: "paymentFeeFixed", label: "Payment processing fixed fee", unit: "money", essential: true },
  { key: "shopifyFeePct", label: "Shopify transaction fee %", unit: "percent", essential: false },
  { key: "returnRatePct", label: "Return / refund rate %", unit: "percent", essential: true },
  { key: "returnCostPerReturn", label: "Unrecovered cost per return", unit: "money", essential: true },
  { key: "chargebackRatePct", label: "Chargeback rate %", unit: "percent", essential: false },
  { key: "chargebackCost", label: "Cost per chargeback", unit: "money", essential: false },
  { key: "damagePct", label: "Damaged-item allowance % of supplier price", unit: "percent", essential: false },
  { key: "otherCosts", label: "Other costs per order", unit: "money", essential: false },
  { key: "cac", label: "Advertising cost per order (CAC)", unit: "money", essential: true },
  { key: "batchUnits", label: "Units in first purchase (for capital)", unit: "count", essential: false },
] as const;

export type InputKey = (typeof INPUT_DEFS)[number]["key"];
export const INPUT_KEYS = INPUT_DEFS.map((d) => d.key) as InputKey[];
export interface InputValue { value: number | null; status: DataStatus; note?: string | null }
export type Inputs = Partial<Record<InputKey, InputValue>>;
export interface MarketSettings { pricesIncludeTax: boolean }

export interface Line { label: string; amount: number; status: DataStatus | "CALCULATED" }
export interface Scenario { label: string; cac: number; netProfit: number; margin: number | null }

export type CalcResult =
  | { complete: false; missing: InputKey[]; quality: "incomplete" }
  | {
      complete: true;
      quality: "verified" | "estimated";
      assumedZero: InputKey[]; // optional inputs that were UNKNOWN and counted as 0
      estimatedKeys: InputKey[];
      revenue: number; taxCollected: number; grossCollected: number;
      landedCost: number; costsBeforeAds: number; totalCost: number;
      contributionBeforeAds: number; netProfit: number;
      margin: number | null; roi: number | null;
      maxAffordableCac: number; breakEvenRoas: number | null;
      breakEvenPrice: number | null; capitalPerOrder: number; batchCapital: number | null;
      lines: Line[]; scenarios: Scenario[];
    };
