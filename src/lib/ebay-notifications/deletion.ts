import {randomUUID} from "node:crypto";
import type {Prisma} from "../../../generated/prisma/client";
import {prisma} from "../db/prisma";
import {identityHash,notificationConfig,deletionSchema,isEbayUrl} from "./protocol";
export async function assertMerchantAllowed(tx:Prisma.TransactionClient,merchant:string){
 if(!process.env.EBAY_DELETION_ENDPOINT)return;
 const hash=identityHash(merchant,notificationConfig().secret);
 if(await tx.ebayDeletion.findUnique({where:{identityHash:hash}}))throw new Error("eBay deleted-account data cannot be imported again.");
}
export async function deleteAccount(payload:unknown){
 const data=deletionSchema.parse(payload).notification.data;
 const identities=[...new Set([data.username,data.userId].filter((v):v is string=>!!v))];
 const {secret}=notificationConfig();
 await prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340923)`;
  for(const identity of identities){
   const hash=identityHash(identity,secret);
   await tx.ebayDeletion.upsert({where:{identityHash:hash},create:{id:randomUUID(),identityHash:hash},update:{}});
   // Include manual observations/imports of this seller, not just API-created ones.
   const matching={merchant:{equals:identity,mode:"insensitive" as const},url:{contains:"ebay.",mode:"insensitive" as const}};
   const observations=await tx.competitorObservation.findMany({where:matching,select:{id:true,url:true,opportunityId:true}});
   const offers=await tx.externalOffer.findMany({where:matching,select:{id:true,url:true,opportunityId:true}});
   const matchedObservations=observations.filter(r=>isEbayUrl(r.url));
   const matchedOffers=offers.filter(r=>isEbayUrl(r.url));
   const ids=[...new Set([...matchedObservations,...matchedOffers].map(r=>r.opportunityId))];
   // Remove historical saved packets/reports that can embed deleted observations.
   if(ids.length)await tx.aiResearchRun.deleteMany({where:{opportunityId:{in:ids}}});
   // Also remove old snapshots whose live observation has already been removed.
   await tx.$executeRaw`DELETE FROM "AiResearchRun" WHERE EXISTS (SELECT 1 FROM jsonb_array_elements("snapshot"->'sources') s WHERE lower(s->'data'->>'merchant') = lower(${identity}) AND (s->'data'->>'url') ILIKE '%ebay.%')`;
   await tx.externalOffer.deleteMany({where:{id:{in:matchedOffers.map(r=>r.id)}}});
   await tx.competitorObservation.deleteMany({where:{id:{in:matchedObservations.map(r=>r.id)}}});
  }
 });
}
