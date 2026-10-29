import type { Prisma, Market } from "../../../generated/prisma/client";
import { evaluationHistoryInclude, evaluationSnapshot, marketSnapshot } from "./snapshots";
export { evaluationHistoryInclude, evaluationSnapshot, marketSnapshot };
export async function captureEvaluation(tx: Prisma.TransactionClient, id: number) {
  const evaluation = await tx.evaluation.findUniqueOrThrow({ where: { id } });
  const market = await tx.market.findUniqueOrThrow({ where: { id: evaluation.marketId } });
  const inputs = await tx.costInput.findMany({ where: { evaluationId: id }, orderBy: { key: "asc" } });
  const opportunity = await tx.opportunity.findUniqueOrThrow({ where: { id: evaluation.opportunityId }, select: { id: true, name: true } });
  return evaluationSnapshot({ ...evaluation, market, inputs, opportunity });
}
// Sequential batched relation reads avoid concurrent queries on a pinned pg transaction.
export async function captureMarketEvaluations(tx: Prisma.TransactionClient, market: Market) {
  const evaluations = await tx.evaluation.findMany({ where: { marketId: market.id }, orderBy: { id: "asc" } });
  if (!evaluations.length) return [];
  const inputs = await tx.costInput.findMany({ where: { evaluationId: { in: evaluations.map(e => e.id) } }, orderBy: { key: "asc" } });
  const products = await tx.opportunity.findMany({ where: { id: { in: [...new Set(evaluations.map(e => e.opportunityId))] } }, select: { id: true, name: true } });
  const productById = new Map(products.map(p => [p.id, p]));
  const inputsByEvaluation = new Map<number, typeof inputs>();
  for (const input of inputs) { const list = inputsByEvaluation.get(input.evaluationId) ?? []; list.push(input); inputsByEvaluation.set(input.evaluationId, list); }
  return evaluations.map(e => {
    const opportunity = productById.get(e.opportunityId);
    if (!opportunity) throw new Error("Missing product during financial history capture");
    return evaluationSnapshot({ ...e, market, opportunity, inputs: inputsByEvaluation.get(e.id) ?? [] });
  });
}
type Snapshot = ReturnType<typeof evaluationSnapshot> | ReturnType<typeof marketSnapshot>;
export function historyData(kind: string, before: Snapshot | null, after: Snapshot, context: Prisma.InputJsonObject = {}) {
  return { scope: after.entity, recordId: after.id, version: after.version, kind, marketId: after.market.id,
    evaluationId: after.entity === "EVALUATION" ? after.id : null,
    before: JSON.parse(JSON.stringify(before ?? { exists: false })) as Prisma.InputJsonObject,
    after: JSON.parse(JSON.stringify(after)) as Prisma.InputJsonObject, context };
}
export async function recordChange(tx: Prisma.TransactionClient, kind: string, before: Snapshot | null, after: Snapshot, context: Prisma.InputJsonObject = {}) {
  return tx.financialChange.create({ data: historyData(kind, before, after, context) });
}
