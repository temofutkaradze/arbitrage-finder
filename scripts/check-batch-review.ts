import {authenticatedFetch,cleanupTestSessions} from "./test-auth";
import assert from "node:assert/strict";
import {prisma} from "../src/lib/db/prisma";
import {INPUT_DEFS} from "../src/lib/profit/types";
async function main(){
 const tag=crypto.randomUUID();let product:number|undefined,listing:number|undefined;const markets:number[]=[];
 try{
  const p=await prisma.opportunity.create({data:{name:'Review fixture '+tag,notes:'PRIVATE_GENERAL_NOTE_EXCLUDED'}});product=p.id;
  const l=await prisma.sourceListing.create({data:{provider:'cj',importedVia:'CJ_API',externalId:tag,name:p.name,currency:'USD',url:'https://example.com/fixture',opportunityId:p.id,observedAt:new Date()}});listing=l.id;
  for(const cur of ['USD','EUR']){
   const m=await prisma.market.create({data:{code:'BR-'+cur+'-'+tag.slice(0,8),name:'Review fixture',currency:cur,countryCode:cur==='USD'?'US':'DE'}});markets.push(m.id);
   await prisma.evaluation.create({data:{opportunityId:p.id,marketId:m.id,inputs:{create:INPUT_DEFS.map(d=>({key:d.key,value:cur==='EUR'&&d.key==='cac'?null:d.key==='sellingPrice'?2000:d.key==='supplierPrice'?1000:d.key==='shippingToCustomer'?200:d.key==='cac'?100:0,status:cur==='EUR'&&d.key==='cac'?'UNKNOWN':'ESTIMATED'}))}}});
  }
  const before=JSON.stringify(await prisma.costInput.findMany({where:{evaluation:{opportunityId:p.id}},orderBy:{id:'asc'}}));
  const runCount=await prisma.aiResearchRun.count(),budget=JSON.stringify(await prisma.aiResearchBudget.findMany());
  const path=`http://127.0.0.1:3000/automation/review?ids=${l.id}`;
  assert.equal((await fetch(path,{redirect:'manual'})).status,307);
  const response=await authenticatedFetch(path);assert.equal(response.status,200);const html=await response.text();
  assert.ok(html.includes('$7.00'));assert.ok(html.includes('EUR'));assert.ok(html.includes('Advertising cost per order (CAC)'));assert.ok(html.includes('გასაგზავნი პაკეტის გადახედვა'));assert.ok(!html.includes('PRIVATE_GENERAL_NOTE_EXCLUDED'));assert.ok(html.includes('სხვა ბაზრების მონაცემებსაც'));
  const filtered=await authenticatedFetch(path+`&market=${markets[1]}`);assert.equal(filtered.status,200);assert.ok((await filtered.text()).includes('სრული გამოთვლა ვერ სრულდება'));
  // Filtering the financial view does not silently shrink the AI packet.
  assert.ok((await (await authenticatedFetch(path+`&market=${markets[1]}`)).text()).includes('USD'));
  for(const suffix of [`${l.id},${l.id}`,`${l.id},2,3,4`,'bad','2147483648'])assert.equal((await authenticatedFetch(`http://127.0.0.1:3000/automation/review?ids=${suffix}`)).status,404);
  assert.equal(JSON.stringify(await prisma.costInput.findMany({where:{evaluation:{opportunityId:p.id}},orderBy:{id:'asc'}})),before);
  assert.equal(await prisma.financialChange.count({where:{evaluation:{opportunityId:p.id}}}),0);assert.equal(await prisma.aiResearchRun.count(),runCount);assert.equal(JSON.stringify(await prisma.aiResearchBudget.findMany()),budget);
  console.log('PASS: owner-only bounded review, separate currencies and unknown CAC, private notes excluded, product-wide packet disclosure, unchanged costs/history/AI budget and no generation on GET');
 }finally{if(listing)await prisma.sourceListing.deleteMany({where:{id:listing}});if(product)await prisma.opportunity.deleteMany({where:{id:product}});await prisma.market.deleteMany({where:{id:{in:markets}}});await cleanupTestSessions();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Review check failed');process.exitCode=1;}).finally(()=>prisma.$disconnect());
