import { prisma } from "../db/prisma";
// Read saved provider reports only. Viewing progress never calls CJ.
export async function loadSupplierProgress(productIds: number[]) {
  const [listings, evaluations] = await Promise.all([
    prisma.sourceListing.findMany({ where: { opportunityId: { in: productIds }, provider: "cj", importedVia: "CJ_API" },
      include: { variants: { where: { active: true }, orderBy: { id: "asc" }, take: 100,
        include: { quotes: { orderBy: { observedAt: "desc" }, take: 10, include: { market: true } } } } } }),
    prisma.evaluation.findMany({ where: { opportunityId: { in: productIds } }, include: { market: true,
      financialChanges: { orderBy: { id: "desc" }, take: 1 } } }),
  ]);
  return { listings, evaluations };
}
export type SupplierProgressData = Awaited<ReturnType<typeof loadSupplierProgress>>;
