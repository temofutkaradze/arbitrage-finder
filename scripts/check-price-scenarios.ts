import { authenticatedFetch,cleanupTestSessions } from "./test-auth";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db/prisma";
import { INPUT_DEFS } from "../src/lib/profit/types";
async function main(){
 const tag=crypto.randomUUID();
 const market=await prisma.market.create({data:{code:`SC-${tag}`,name:"Scenario fixture",currency:"USD",pricesIncludeTax:false,countryCode:"US"}});
 let productId:number|undefined;
 try{
  const product=await prisma.opportunity.create({data:{name:`Scenario fixture ${tag}`}});productId=product.id;
  const evaluation=await prisma.evaluation.create({data:{opportunityId:product.id,marketId:market.id,inputs:{create:INPUT_DEFS.map(d=>({key:d.key,value:d.key==="supplierPrice"?1000:d.key==="shippingToCustomer"?500:d.key==="cac"?100:d.key==="sellingPrice"?9000:0,status:"ESTIMATED"}))}}});
  await prisma.competitorObservation.create({data:{opportunityId:product.id,marketId:market.id,merchant:"Fixture source",url:"https://example.com/scenario-fixture",match:"EXACT",comparison:"Exact fixture variant; testing only.",priceMinor:2000,shippingMinor:0,currency:"USD",taxBasis:"EXCLUDED",observedAt:new Date(Date.now()-1000),expiresAt:new Date(Date.now()+86400000)}});
  const before=JSON.stringify(await prisma.costInput.findMany({where:{evaluationId:evaluation.id},orderBy:{key:"asc"}}));
  const history=await prisma.financialChange.count({where:{evaluationId:evaluation.id}});
  for(const path of [`/opportunities/${product.id}`,`/research?product=${product.id}&market=${market.id}`]){
   const response=await authenticatedFetch(`http://127.0.0.1:3000${path}`);assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes("კონკურენტის ფასზე ფინანსური სცენარები"));assert.ok(html.includes("$4.00"));assert.ok(html.includes("$20.00"));
  }
  assert.equal(JSON.stringify(await prisma.costInput.findMany({where:{evaluationId:evaluation.id},orderBy:{key:"asc"}})),before);
  assert.equal(await prisma.financialChange.count({where:{evaluationId:evaluation.id}}),history);
  console.log("PASS: competitor economics render on product and research pages using the existing calculator; saved cost inputs and financial history remain unchanged");
 }finally{if(productId)await prisma.opportunity.deleteMany({where:{id:productId}});await prisma.market.deleteMany({where:{id:market.id}});await cleanupTestSessions();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Scenario check failed");process.exitCode=1;}).finally(()=>prisma.$disconnect());
