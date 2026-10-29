import "dotenv/config";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {prisma} from "../src/lib/db/prisma";
import {saveExternalOffers,reviewOffer} from "../src/lib/providers/offers";
async function main(){
 let productId:number|undefined,marketId:number|undefined;const tag=randomUUID();
 try{
  const p=await prisma.opportunity.create({data:{name:`TEST FIXTURE offer ${tag}`,isSample:true}});productId=p.id;
  const m=await prisma.market.create({data:{code:`E${tag.slice(0,8)}`,name:"TEST FIXTURE — not a chosen market",currency:"GBP",countryCode:"GB"}});marketId=m.id;
  const offers=[{provider:"ebay",externalId:tag,title:"TEST FIXTURE",merchant:"fixture-seller",url:`https://www.ebay.co.uk/itm/${tag}`,priceMinor:1234,currency:"GBP"}];
  await saveExternalOffers(productId,marketId,"GB",offers);let offer=await prisma.externalOffer.findFirstOrThrow({where:{opportunityId:productId}});
  assert.equal(offer.state,"PENDING");assert.equal(await prisma.competitorObservation.count({where:{opportunityId:productId}}),0);
  const review={id:offer.id,decision:"ACCEPT",match:"EQUIVALENT",comparison:"TEST FIXTURE: equivalent pack and condition; shipping not confirmed",shippingMinor:"",taxBasis:"UNKNOWN"};
  await reviewOffer(review);let observation=await prisma.competitorObservation.findFirstOrThrow({where:{opportunityId:productId}});assert.equal(observation.shippingMinor,null);
  await assert.rejects(reviewOffer(review),/already reviewed/);
  await saveExternalOffers(productId,marketId,"GB",offers);offer=await prisma.externalOffer.findUniqueOrThrow({where:{id:offer.id}});assert.equal(offer.state,"PENDING");
  observation=await prisma.competitorObservation.findUniqueOrThrow({where:{id:observation.id}});assert.ok(observation.expiresAt<=new Date());
  await prisma.market.update({where:{id:marketId},data:{countryCode:"US"}});await assert.rejects(reviewOffer(review),/market changed/);
  await assert.rejects(saveExternalOffers(productId,marketId,"GB",offers),/market changed/);
  await prisma.market.update({where:{id:marketId},data:{countryCode:"GB"}});
  await reviewOffer({...review,decision:"REJECT"});assert.equal((await prisma.externalOffer.findUniqueOrThrow({where:{id:offer.id}})).state,"REJECTED");
  assert.equal(await prisma.evidence.count({where:{opportunityId:productId}}),0);
  console.log("PASS: pending offers, manual acceptance, unknown shipping, repeated-review protection, refresh expiry, route checks and no fabricated demand evidence");
 }finally{if(productId)await prisma.opportunity.delete({where:{id:productId}});if(marketId)await prisma.market.delete({where:{id:marketId}});}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Offer check failed");process.exitCode=1;}).finally(()=>prisma.$disconnect());
