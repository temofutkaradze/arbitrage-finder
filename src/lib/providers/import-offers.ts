import { createHash } from "node:crypto";
import { prisma } from "../db/prisma";
import { parseOfferImport } from "./import-schema";
export async function importPendingOffers(productId:number,marketId:number,version:number,raw:string){
 const batch=parseOfferImport(raw);
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340923)`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340926)`;
  const market=await tx.market.findUniqueOrThrow({where:{id:marketId}});
  const product=await tx.opportunity.findFirst({where:{id:productId,isSample:false}});
  if(!product||market.version!==version||market.countryCode!==batch.destinationCountry||market.currency!==batch.currency)throw new Error("Import context changed; refresh the page and check country/currency.");
  let created=0,updated=0,unchanged=0;
  for(const o of batch.offers){
   const externalId=createHash("sha256").update(o.url).digest("hex");
   const key={opportunityId:productId,marketId,provider:"manual-json",externalId};
   const old=await tx.externalOffer.findUnique({where:{opportunityId_marketId_provider_externalId:key}});
   const observedAt=new Date(o.observedAt),expiresAt=new Date(o.expiresAt);
   if(old&&old.observedAt>observedAt)throw new Error("A newer source observation already exists.");
   if(old&&old.observedAt.getTime()===observedAt.getTime()){
    if(old.priceMinor!==o.priceMinor||old.title!==o.title||old.merchant!==o.merchant||old.expiresAt.getTime()!==expiresAt.getTime()||old.currency!==batch.currency||old.destinationCountry!==batch.destinationCountry)throw new Error("Conflicting data for the same source timestamp.");
    unchanged++;continue;
   }
   if(old?.observationId)await tx.competitorObservation.update({where:{id:old.observationId},data:{expiresAt:new Date(Math.min(Date.now(),old.expiresAt.getTime()))}});
   const fields={title:o.title,merchant:o.merchant,url:o.url,priceMinor:o.priceMinor,currency:batch.currency,destinationCountry:batch.destinationCountry,observedAt,expiresAt};
   await tx.externalOffer.upsert({where:{opportunityId_marketId_provider_externalId:key},create:{...key,...fields},update:{...fields,state:"PENDING",reviewNote:null,observationId:null}});
   if(old)updated++;else created++;
  }
  return {created,updated,unchanged};
 });
}
