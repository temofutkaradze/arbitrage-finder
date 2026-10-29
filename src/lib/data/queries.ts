import { prisma } from "../db/prisma";
import { researchReadiness } from "../research/readiness";
import { calculate } from "../profit/calculate";
import type { CalcResult, DataStatus, InputKey, Inputs } from "../profit/types";

export type StoredInput = { value: number | null; status: DataStatus; note?: string | null };

export function rowsToInputs(rows: { key: string; value: number | null; status: DataStatus; note: string | null }[]): Inputs {
  const out: Inputs = {};
  for (const r of rows) out[r.key as InputKey] = { value: r.value, status: r.status, note: r.note };
  return out;
}

export const getMarkets = () => prisma.market.findMany({ orderBy: { code: "asc" } });

export type EvalRow = {
  id: number; opportunityId: number; name: string; category: string | null; sourceName: string | null;
  research: ReturnType<typeof researchReadiness>; isSample: boolean; marketCode: string; currency: string; price: number | null; result: CalcResult; updatedAt: Date;
};

export async function getEvalRows(): Promise<EvalRow[]> {
  const evals = await prisma.evaluation.findMany({
    include: { opportunity: { include: { evidence: true } }, market: true, inputs: true },
    orderBy: { updatedAt: "desc" },
  });
  return evals.map((e) => {
    const inputs = rowsToInputs(e.inputs);
    const sp = inputs.sellingPrice;
    return {
      research: researchReadiness(e.opportunity.evidence, e.marketId), id: e.id, opportunityId: e.opportunityId, name: e.opportunity.name, category: e.opportunity.category,
      sourceName: e.opportunity.sourceName, isSample: e.opportunity.isSample, marketCode: e.market.code,
      currency: e.market.currency, price: sp && sp.status !== "UNKNOWN" ? sp.value : null,
      result: calculate(inputs, { pricesIncludeTax: e.market.pricesIncludeTax }), updatedAt: e.updatedAt,
    };
  });
}

export async function getOpportunity(id: number) {
  const o = await prisma.opportunity.findUnique({
    where: { id },
    include: { evidence: true, evaluations: { include: { market: true, inputs: true }, orderBy: { id: "asc" } } },
  });
  if (!o) return null;
  return {
    ...o,
    evaluations: o.evaluations.map((e) => {
      const inputs = rowsToInputs(e.inputs);
      return { id: e.id, version: e.version, market: e.market, inputs, result: calculate(inputs, { pricesIncludeTax: e.market.pricesIncludeTax }) };
    }),
  };
}
