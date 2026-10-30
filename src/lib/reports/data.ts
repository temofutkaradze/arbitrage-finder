import type { Prisma } from "../../../generated/prisma/client";
import { assertReportLimits } from "./policy";
export { ReportLimitError } from "./policy";
import { prisma } from "../db/prisma";
export const reportInclude = {
  evaluations: { include: { market: true, inputs: true }, orderBy: { id: "asc" }, take: 101 },
  evidence: { include: { market: true }, orderBy: { id: "asc" }, take: 2001 },
  listings: { include: { identity: true }, orderBy: { id: "asc" }, take: 501 },
  competitors: { include: { market: true }, orderBy: { id: "asc" }, take: 2001 },
} satisfies Prisma.OpportunityInclude;
type BaseReport = Prisma.OpportunityGetPayload<{ include: typeof reportInclude }>;
export type ReportData = BaseReport & {
  supplierVariants: Prisma.SupplierVariantGetPayload<object>[];
  shippingQuotes: Prisma.ShippingQuoteGetPayload<{include:{market:true}}> [];
};
export async function loadReport(id: number) {
  // A consistent read snapshot; no API calls or writes when downloading.
  return prisma.$transaction(async tx => {
    const data = await tx.opportunity.findUnique({ where: { id }, include: reportInclude });
    if (!data) return null;
    assertReportLimits(data);
    const supplierVariants=await tx.supplierVariant.findMany({where:{listing:{opportunityId:id}},orderBy:{id:"asc"},take:501});
    const shippingQuotes=await tx.shippingQuote.findMany({where:{variant:{listing:{opportunityId:id}}},include:{market:true},orderBy:{id:"asc"},take:2001});
    const report={...data,supplierVariants,shippingQuotes};
    assertReportLimits(report);
    return report;
  }, { isolationLevel: "RepeatableRead", timeout: 20_000 });
}
