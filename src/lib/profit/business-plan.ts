import { calculate } from "./calculate";
import type { Inputs, MarketSettings } from "./types";

/** Money in minor units; margin in basis points. Null means unknown, never zero. */
export type BusinessAssumptions = {
  monthlyFixed: number | null;
  monthlyOrders: number | null;
  targetMarginBp: number | null;
  buffer: number | null;
  payoutDays: number | null;
  dailyOrders: number | null;
  cashReserve: number | null;
};

export function businessPlan(inputs: Inputs, market: MarketSettings, a: BusinessAssumptions) {
  for (const [key, value] of Object.entries(a)) {
    if (value !== null && (!Number.isSafeInteger(value) || value < 0 || value > 2_000_000_000)) {
      throw new Error("Invalid planning assumption");
    }
    if (key === "targetMarginBp" && value !== null && value > 10000) {
      throw new Error("Invalid target margin");
    }
  }
  if (a.monthlyOrders === 0) throw new Error("Monthly orders must be positive");

  const base = calculate(inputs, market);
  if (!base.complete) return { base, stress: null, plan: null, cash: null };

  // Reuse the existing calculator so taxes and fees also respond to the stress.
  // Changes are hypothetical and do not alter saved inputs or evidence status.
  const stressed: Inputs = { ...inputs };
  const adjust = (key: keyof Inputs, fn: (n: number) => number) => {
    const field = inputs[key];
    if (field && field.value !== null && field.status !== "UNKNOWN") {
      stressed[key] = { ...field, value: fn(field.value), status: "ESTIMATED" };
    }
  };
  adjust("sellingPrice", n => Math.floor(n * 95 / 100));
  adjust("supplierPrice", n => Math.ceil(n * 110 / 100));
  adjust("shippingToCustomer", n => Math.ceil(n * 110 / 100));
  adjust("cac", n => Math.ceil(n * 125 / 100));
  adjust("returnRatePct", n => Math.min(10000, n + 200));
  const stress = calculate(stressed, market);

  const plan = a.monthlyFixed !== null && a.monthlyOrders !== null &&
    a.targetMarginBp !== null && a.buffer !== null ? (() => {
      const fixedPerOrder = Math.ceil(a.monthlyFixed / a.monthlyOrders);
      const targetProfit = Math.ceil(base.revenue * a.targetMarginBp / 10000);
      const maxTargetCac = base.contributionBeforeAds - fixedPerOrder - a.buffer - targetProfit;
      const perOrder = base.netProfit - fixedPerOrder - a.buffer;
      // Conservative allocation may overstate overhead by <1 minor unit/order.
      const monthly = perOrder * a.monthlyOrders;
      const breakEvenOrders = base.netProfit - a.buffer > 0
        ? Math.ceil(a.monthlyFixed / (base.netProfit - a.buffer)) : null;
      const stressPerOrder = stress.complete ? stress.netProfit - fixedPerOrder - a.buffer : null;
      return { fixedPerOrder, targetProfit, maxTargetCac, perOrder, monthly, breakEvenOrders, stressPerOrder };
    })() : null;

  // Conservative prefunding illustration, not a settlement contract or peak cash forecast.
  const cash = a.monthlyFixed !== null && a.payoutDays !== null &&
    a.dailyOrders !== null && a.cashReserve !== null ? {
      amount: base.totalCost * a.payoutDays * a.dailyOrders + a.monthlyFixed + a.cashReserve,
      dailyOutflow: base.totalCost * a.dailyOrders,
    } : null;

  for (const value of [...Object.values(plan ?? {}), ...Object.values(cash ?? {})]) {
    if (value !== null && !Number.isSafeInteger(value)) {
      throw new Error("Planning result exceeds supported range");
    }
  }
  return { base, stress, plan, cash };
}
