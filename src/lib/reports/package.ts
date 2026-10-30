import type { ReportData } from "./data";
import { calculate } from "../profit/calculate";
import type { Inputs } from "../profit/types";
const inputMap=(e:ReportData["evaluations"][number]):Inputs=>Object.fromEntries(e.inputs.map(i=>[i.key,{value:i.value,status:i.status,note:i.note}]));
import { researchReadiness } from "../research/readiness";
import { competitorPriceScenarios } from "../research/price-scenarios";
import { quoteUsability } from "../sourcing/progress-status";
export function researchPackage(data:ReportData,now=new Date()) {
 return {
  schema:"arbitrage-finder.research",version:2,generatedAtUtc:now.toISOString(),
  limitations:["Saved local records only; no fresh external requests or currency conversion.","Local IDs are references within this snapshot, not portable import keys.","Not a database backup or an import file. No writes occur when downloading.","VERIFIED is an operator status, not independent certification.","Contribution excludes fixed overhead and business income tax; unknown optional costs may be zero.","Provider quotes and stock are estimates, not reservations, tax clearance or final checkout quotes.","Private notes, source URLs and research postal codes are included. Review before sharing; text entered by the owner is not automatically redacted.","Excludes AI reports, financial/matching history, price observations and unreviewed external offers."],
  product:{id:data.id,name:data.name,category:data.category,sourceName:data.sourceName,sourceUrl:data.sourceUrl,notes:data.notes,isSample:data.isSample,createdAt:data.createdAt,updatedAt:data.updatedAt},
  evaluations:data.evaluations.map(e=>({ ...e, calculation:calculate(inputMap(e),{pricesIncludeTax:e.market.pricesIncludeTax}),readiness:researchReadiness(data.evidence,e.marketId,now),competitorPriceScenarios:competitorPriceScenarios(data.competitors,inputMap(e),e.market,now)})),
  supplierListings:data.listings,
  supplierVariants:data.supplierVariants.map(v=>({...v,reportAgeHours:(now.getTime()-v.observedAt.getTime())/3600000})),
  shippingQuotes:data.shippingQuotes.map(q=>({...q,reviewState:data.supplierVariants.find(v=>v.id===q.variantId)?.active?quoteUsability(q,q.market.countryCode,now):"inactive_variant"})),
  evidence:data.evidence.map(e=>({...e,recordState:e.resolvedAt?"RETIRED":e.expiresAt<=now?"EXPIRED":"Within recorded expiry"})),
  competitorObservations:data.competitors,
 };
}
