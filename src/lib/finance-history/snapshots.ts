import type { Prisma, Market } from "../../../generated/prisma/client";
import { calculate } from "../profit/calculate";
import type { Inputs } from "../profit/types";
export const evaluationHistoryInclude = { market: true, inputs: { orderBy: { key: "asc" } }, opportunity: { select: { id: true, name: true } } } as const;
export type HistoryEvaluation = Prisma.EvaluationGetPayload<{ include: typeof evaluationHistoryInclude }>;
export function marketSnapshot(market: Market) {
  return { format: 1, entity: "MARKET", id: market.id, version: market.version, market: { id: market.id, code: market.code, name: market.name, currency: market.currency, countryCode: market.countryCode, pricesIncludeTax: market.pricesIncludeTax }, assumptions: market.assumptions };
}
export function evaluationSnapshot(evaluation: HistoryEvaluation) {
  const inputs = evaluation.inputs.map(i => ({ key: i.key, value: i.value, status: i.status, note: i.note }));
  const calculatedInputs: Inputs = Object.fromEntries(inputs.map(i => [i.key, { value: i.value, status: i.status, note: i.note }]));
  return { format: 1, entity: "EVALUATION", id: evaluation.id, version: evaluation.version,
    product: evaluation.opportunity, market: marketSnapshot(evaluation.market).market, inputs,
    calculator: "contribution-v1", calculated: calculate(calculatedInputs, { pricesIncludeTax: evaluation.market.pricesIncludeTax }) };
}
