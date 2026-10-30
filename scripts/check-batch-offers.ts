import "./test-auth";
import assert from "node:assert/strict";
import {prisma} from "../src/lib/db/prisma";
import {collectBatchOffers} from "../src/lib/automation/batch-offers";
async function main(){
 const tag=crypto.randomUUID();let product:number|undefined,market:number|undefined,listing:number|undefined;
 try{
  const p=await prisma.opportunity.create({data:{name:'Batch offers fixture '+tag,isSample:true}});product=p.id;
  const m=await prisma.market.create({data:{code:'B'+tag.slice(0,8),name:'Batch offers fixture',currency:'USD',countryCode:'US'}});market=m.id;
  const l=await prisma.sourceListing.create({data:{name:'fixture shelf',provider:'cj',importedVia:'CJ_API',externalId:tag,url:'https://example.com/fixture',currency:'USD',observedAt:new Date(),opportunityId:p.id}});listing=l.id;
  let calls=0;const fake=async(op:number,mi:number,q:string)=>{calls++;assert.equal(op,p.id);assert.equal(mi,m.id);assert.equal(q,l.name);return 2;};
  assert.equal((await collectBatchOffers(l.id,m.id,fake,false)).state,'blocked');assert.equal(calls,0);
  assert.equal((await collectBatchOffers(l.id,m.id,fake,true)).state,'blocked');assert.equal(calls,0);
  await prisma.evaluation.create({data:{opportunityId:p.id,marketId:m.id}});
  const result=await collectBatchOffers(l.id,m.id,fake,true);assert.equal(result.state,'done');assert.equal(calls,1);assert.ok(result.message.includes('pending'));assert.ok(result.href?.includes(`product=${p.id}`));
  await prisma.market.update({where:{id:m.id},data:{countryCode:'GE'}});
  assert.equal((await collectBatchOffers(l.id,m.id,fake,true)).state,'blocked');assert.equal(calls,1);
  assert.equal(await prisma.financialChange.count({where:{evaluation:{opportunityId:p.id}}}),0);
  console.log('PASS: missing access/evaluation and wrong country block collection; valid scope calls mocked collector once, returns review link, no financial changes');
 }finally{if(listing)await prisma.sourceListing.delete({where:{id:listing}});if(product)await prisma.opportunity.delete({where:{id:product}});if(market)await prisma.market.delete({where:{id:market}});}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Batch offers check failed');process.exitCode=1;}).finally(()=>prisma.$disconnect());
