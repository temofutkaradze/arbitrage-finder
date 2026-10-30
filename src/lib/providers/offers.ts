import {ebayConnectionMode} from "./ebay-auth";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { searchEbay, type normalizeEbay } from "./ebay";
export async function saveExternalOffers(opportunityId:number,marketId:number,country:string,offers:ReturnType<typeof normalizeEbay>){
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340923)`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340926)`;
  const market=await tx.market.findUniqueOrThrow({where:{id:marketId}});
  if(market.countryCode!==country||offers.some(o=>o.currency!==market.currency))throw new Error("eBay market changed while fetching; request again.");
  const observedAt=new Date(),expiresAt=new Date(observedAt.getTime()+86400000);
  for(const offer of offers){
   const key={opportunityId,marketId,provider:offer.provider,externalId:offer.externalId};
   const old=await tx.externalOffer.findUnique({where:{opportunityId_marketId_provider_externalId:key}});
   if(old?.observationId)await tx.competitorObservation.update({where:{id:old.observationId},data:{expiresAt:observedAt}});
   await tx.externalOffer.upsert({where:{opportunityId_marketId_provider_externalId:key},create:{...offer,opportunityId,marketId,destinationCountry:country,observedAt,expiresAt},update:{...offer,destinationCountry:country,observedAt,expiresAt,state:"PENDING",reviewNote:null,observationId:null}});
  }
  return offers.length;
 });
}
export async function fetchEbayOffers(opportunityId:number,marketId:number,query:string){
 const market=await prisma.market.findUniqueOrThrow({where:{id:marketId}});
 if(!market.countryCode)throw new Error("eBay needs an explicit destination country in Markets.");
 if(ebayConnectionMode()==="missing")throw new Error("eBay is not connected. Configure production EBAY_CLIENT_ID and EBAY_CLIENT_SECRET securely; no credentials are entered here.");
 await prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340927)`;
  const last=await tx.importRun.findFirst({where:{source:"ebay-attempt"},orderBy:{completedAt:"desc"}});
  if(last&&Date.now()-last.completedAt.getTime()<60000)throw new Error("eBay wait one minute between search attempts.");
  await tx.importRun.create({data:{source:"ebay-attempt",created:0,updated:0,unchanged:0}});
 });
 const offers=await searchEbay(query,market.countryCode,market.currency);
 return saveExternalOffers(opportunityId,marketId,market.countryCode,offers);
}
export const reviewSchema=z.object({id:z.coerce.number().int().positive(),decision:z.enum(["ACCEPT","REJECT"]),
 match:z.enum(["EXACT","EQUIVALENT"]),comparison:z.string().trim().min(20).max(1800),
 shippingMinor:z.preprocess(v=>v===""?null:v,z.coerce.number().int().nonnegative().max(2000000000).nullable()),taxBasis:z.enum(["UNKNOWN","INCLUDED","EXCLUDED"])});
export async function reviewOffer(input:unknown){
 const values=reviewSchema.parse(input);
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340923)`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340926)`;
  const offer=await tx.externalOffer.findUniqueOrThrow({where:{id:values.id},include:{market:true}});
  if(offer.state!=="PENDING")throw new Error("Offer already reviewed; refresh before making a new observation.");
  if(offer.expiresAt<=new Date()||offer.destinationCountry!==offer.market.countryCode||offer.currency!==offer.market.currency)throw new Error("Offer expired or the market changed; search again.");
  if(values.decision==="REJECT"){await tx.externalOffer.update({where:{id:offer.id},data:{state:"REJECTED",reviewNote:values.comparison}});return;}
  const observation=await tx.competitorObservation.create({data:{opportunityId:offer.opportunityId,marketId:offer.marketId,merchant:offer.merchant,url:offer.url,match:values.match,comparison:`[Reviewed ${offer.provider} offer ${offer.externalId}] ${values.comparison}`,priceMinor:offer.priceMinor,shippingMinor:values.shippingMinor,currency:offer.currency,taxBasis:values.taxBasis,observedAt:offer.observedAt,expiresAt:offer.expiresAt}});
  await tx.externalOffer.update({where:{id:offer.id},data:{state:"ACCEPTED",reviewNote:values.comparison,observationId:observation.id}});
 });
}
