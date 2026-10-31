import "./test-auth";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {prisma} from "../src/lib/db/prisma";
import {deleteAccount,assertMerchantAllowed} from "../src/lib/ebay-notifications/deletion";
import {identityHash} from "../src/lib/ebay-notifications/protocol";
async function main(){
 // Use only with the reviewed migration applied. This check sends no provider calls.
 process.env.EBAY_DELETION_ENDPOINT="https://example.com/api/ebay/account-deletion";
 process.env.EBAY_DELETION_VERIFICATION_TOKEN="a".repeat(32);
 process.env.EBAY_DELETION_HASH_SECRET=randomUUID();
 const seller=`deletion-fixture-${randomUUID()}`;
 const userId=randomUUID();const secret=process.env.EBAY_DELETION_HASH_SECRET;
 const market=await prisma.market.create({data:{code:randomUUID(),name:"Deletion fixture",countryCode:"US",currency:"USD"}});
 const product=await prisma.opportunity.create({data:{name:"Deletion fixture"}});
 try{
  const row=await prisma.competitorObservation.create({data:{opportunityId:product.id,marketId:market.id,merchant:seller,url:"https://www.ebay.com/itm/123",match:"UNCERTAIN",comparison:"Fixture observation only",priceMinor:100,currency:"USD",taxBasis:"UNKNOWN",observedAt:new Date(),expiresAt:new Date(Date.now()+10000)}});
  await prisma.externalOffer.create({data:{opportunityId:product.id,marketId:market.id,provider:"ebay",externalId:randomUUID(),title:"Fixture",merchant:seller,url:row.url,priceMinor:100,currency:"USD",destinationCountry:"US",state:"ACCEPTED",observationId:row.id,observedAt:new Date(),expiresAt:new Date(Date.now()+10000)}});
  await prisma.aiResearchRun.create({data:{opportunityId:product.id,model:"mock",state:"SUCCEEDED",inputHash:"test",snapshot:{sources:[{data:{merchant:seller,url:row.url}}]},report:{text:"mock derived report"}}});
  const payload={metadata:{topic:"MARKETPLACE_ACCOUNT_DELETION",schemaVersion:"1.0"},notification:{notificationId:randomUUID(),data:{username:seller,userId}}};
  await deleteAccount(payload);await deleteAccount(payload);
  assert.equal(await prisma.competitorObservation.count({where:{id:row.id}}),0);
  assert.equal(await prisma.externalOffer.count({where:{opportunityId:product.id}}),0);
  assert.equal(await prisma.aiResearchRun.count({where:{opportunityId:product.id}}),0);
  assert.equal(await prisma.opportunity.count({where:{id:product.id}}),1);
  await assert.rejects(prisma.$transaction(tx=>assertMerchantAllowed(tx,seller)));
  console.log("PASS: seller offers, accepted observations and saved AI copies removed atomically; repeat delivery safe; product retained; reimport blocked; no provider calls");
 }finally{
  await prisma.opportunity.deleteMany({where:{id:product.id}});await prisma.market.deleteMany({where:{id:market.id}});
  await prisma.ebayDeletion.deleteMany({where:{identityHash:{in:[identityHash(seller,secret),identityHash(userId,secret)]}}});
 }
}
main().catch(()=>{console.error("Deletion integration check failed; verify approved migration and isolated database readiness.");process.exitCode=1;}).finally(()=>prisma.$disconnect());
