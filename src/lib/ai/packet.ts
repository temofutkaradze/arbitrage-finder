import { createHash } from "node:crypto";
import { prisma } from "../db/prisma";
import { getOpportunity } from "../data/queries";
export async function researchPacket(id: number) {
  const product = await getOpportunity(id);
  if (!product || product.isSample) return null;
  const [evidence, competitors, listings] = await Promise.all([
    prisma.evidence.findMany({where:{opportunityId:id},orderBy:{id:"desc"},take:30}),
    prisma.competitorObservation.findMany({where:{opportunityId:id},orderBy:{id:"desc"},take:30}),
    prisma.sourceListing.findMany({where:{opportunityId:id},orderBy:{id:"desc"},take:10,include:{variants:{where:{active:true},orderBy:{id:"asc"},take:10,include:{quotes:{orderBy:{id:"desc"},take:5}}}}}),
  ]);
  const sources = [
    {id:`product:${id}`,type:"product",data:{name:product.name,category:product.category,sourceName:product.sourceName,sourceUrl:product.sourceUrl}},
    ...product.evaluations.slice(0,20).map(e=>({id:`evaluation:${e.id}`,type:"calculator",data:e})),
    ...evidence.map(e=>({id:`evidence:${e.id}`,type:"user_record",data:e})),
    ...competitors.map(c=>({id:`competitor:${c.id}`,type:"displayed_offer",data:c})),
    ...listings.map(l=>({id:`listing:${l.id}`,type:"catalogue_and_provider_estimates",data:l})),
  ];
  // Canonical serialization excludes private general product notes and all account secrets.
  const json=JSON.stringify({version:1,asOfDate:new Date().toISOString().slice(0,10),limits:{evidence:30,competitors:30,listings:10,variantsPerListing:10,quotesPerVariant:5,evaluations:20},sources});
  if(Buffer.byteLength(json)>100_000)throw new Error("Research packet is too large; reduce source notes before sending.");
  return {snapshot:JSON.parse(json),hash:createHash("sha256").update(json).digest("hex"),sources};
}
