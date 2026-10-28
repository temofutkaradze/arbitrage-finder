import type { CalcResult } from "../profit/types";
import type { researchReadiness } from "./readiness";
type RankedEvaluation = { currency: string; result: CalcResult; research: ReturnType<typeof researchReadiness> };
export function decisionTier(row: RankedEvaluation) {
  if (row.research.label === "Risk review") return 3;
  if (!row.result.complete) return 2;
  if (row.result.netProfit <= 0) return 3;
  return row.research.missing.length || row.result.assumedZero.length ? 1 : 0;
}
export function decisionLabel(row: RankedEvaluation) {
  return ["Review for sample test", "Promising / needs research", "Missing economics", "Loss or risk review"][decisionTier(row)];
}
export function compareOpportunities(a: RankedEvaluation, b: RankedEvaluation, sort: "net" | "margin" | "roi") {
  const group = a.currency.localeCompare(b.currency) || decisionTier(a) - decisionTier(b);
  if (group) return group;
  const value = (row: RankedEvaluation) => {
    if (!row.result.complete) return null;
    return sort === "net" ? row.result.netProfit : sort === "margin" ? row.result.margin : row.result.roi;
  };
  const av = value(a), bv = value(b);
  if (av === null) return bv === null ? 0 : 1;
  if (bv === null) return -1;
  return bv - av;
}
