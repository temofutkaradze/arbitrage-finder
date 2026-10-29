import { authenticatedFetch, cleanupTestSessions } from "./test-auth";
import { prisma } from "../src/lib/db/prisma";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const origin="http://127.0.0.1:3000";
const decode=(s:string)=>s.replaceAll("&quot;",'"').replaceAll("&amp;","&").replaceAll("&#x27;","'");
const forms=(s:string)=>[...s.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(m=>m[1]);
async function page(path:string){const r=await authenticatedFetch(origin+path);assert.equal(r.status,200);return r.text();}
async function post(path:string,form:string,values:Record<string,string>){const fd=new FormData();for(const m of form.matchAll(/<input\b[^>]*>/g)){if(!m[0].includes('type="hidden"'))continue;const n=m[0].match(/name="([^"]*)"/)?.[1],v=m[0].match(/value="([^"]*)"/)?.[1]??"";if(n)fd.append(decode(n),decode(v));}for(const[k,v]of Object.entries(values))fd.set(k,v);const r=await authenticatedFetch(origin+path,{method:"POST",headers:{Origin:origin},body:fd});assert.equal(r.status,200);return r.text();}
async function main(){
 const tag=randomUUID(),market=await prisma.market.create({data:{code:`C${tag.slice(0,8)}`,name:"CONFLICT TEST FIXTURE",countryCode:"US",currency:"USD"}});
 const product=await prisma.opportunity.create({data:{name:`CONFLICT TEST FIXTURE ${tag}`,isSample:true}});
 const evaluation=await prisma.evaluation.create({data:{opportunityId:product.id,marketId:market.id,inputs:{create:{key:"supplierPrice",value:999,status:"ESTIMATED",note:"CJ estimate #TEST - preserve on stale market submission"}}}});
 let listingId:number|undefined;
 try{
  const path=`/opportunities/${product.id}`,old=forms(await page(path)).find(f=>f.includes('name="evaluationId"'));assert.ok(old);
  const concurrent=await Promise.all([post(path,old,{sellingPrice__value:"10"}),post(path,old,{sellingPrice__value:"20"})]);
  assert.equal(concurrent.filter(x=>x.includes("Inputs saved.")).length,1);assert.equal(concurrent.filter(x=>x.includes("another window")).length,1);
  const saved=await prisma.evaluation.findUniqueOrThrow({where:{id:evaluation.id}});assert.equal(saved.version,1);
  const price=await prisma.costInput.findUniqueOrThrow({where:{evaluationId_key:{evaluationId:evaluation.id,key:"sellingPrice"}}});assert.ok(price.value===1000||price.value===2000);
  await post(path,old,{sellingPrice__value:"999",expectedVersion:""});assert.equal((await prisma.evaluation.findUniqueOrThrow({where:{id:evaluation.id}})).version,1);
  const editBeforeMarketChange=forms(await page(path)).find(f=>f.includes('name="evaluationId"'))!;
  const marketForm=forms(await page("/markets")).find(f=>f.includes(`name="marketId" value="${market.id}"`));assert.ok(marketForm);
  // Tax interpretation changes invalidate open evaluations even when costs do not change.
  await post("/markets",marketForm,{countryCode:"US",pricesIncludeTax:"on"});
  assert.equal((await prisma.evaluation.findUniqueOrThrow({where:{id:evaluation.id}})).version,2);
  const stale=await post(path,editBeforeMarketChange,{sellingPrice__value:"777"});assert.ok(stale.includes("another window"));
  const expiry=new Date(Date.now()+3600000);await prisma.evidence.create({data:{opportunityId:product.id,marketId:market.id,kind:"SHIPPING",provenance:"PROVIDER_ESTIMATE",outcome:"INCONCLUSIVE",summary:"CJ estimate #TEST - must not expire from losing save",url:"https://example.com",observedAt:new Date(),expiresAt:expiry}});
  await prisma.costInput.update({where:{evaluationId_key:{evaluationId:evaluation.id,key:"supplierPrice"}},data:{value:999,status:"ESTIMATED",note:"CJ estimate #TEST"}});
  const rejectedMarket=await post("/markets",marketForm,{countryCode:"GE"});assert.ok(rejectedMarket.includes("another window"));
  assert.equal((await prisma.market.findUniqueOrThrow({where:{id:market.id}})).countryCode,"US");
  assert.equal((await prisma.costInput.findUniqueOrThrow({where:{evaluationId_key:{evaluationId:evaluation.id,key:"supplierPrice"}}})).value,999);
  assert.equal((await prisma.evidence.findFirstOrThrow({where:{opportunityId:product.id}})).expiresAt.getTime(),expiry.getTime());
  const listing=await prisma.sourceListing.create({data:{provider:"cj",importedVia:"CJ_API",externalId:tag,name:"CONFLICT FIXTURE",url:"https://example.com",currency:"USD",priceMinor:100,observedAt:new Date(),opportunityId:product.id}});listingId=listing.id;
  const variant=await prisma.supplierVariant.create({data:{listingId,externalId:tag,name:"CONFLICT FIXTURE",priceMinor:100,origins:[{countryCode:"US",totalInventory:1,cjInventory:1,factoryInventory:0}],observedAt:new Date()}});
  await prisma.shippingQuote.create({data:{variantId:variant.id,marketId:market.id,originCountry:"US",destinationCountry:"US",postalCode:"10001",method:"CONFLICT FIXTURE",productPriceMinor:100,productObservedAt:new Date(),shippingMinor:200,observedAt:new Date(),expiresAt:expiry}});
  const quotePath=`/discovery/${listing.id}`,quoteForm=forms(await page(quotePath)).find(f=>f.includes('name="quoteId"'));assert.ok(quoteForm);
  const current=forms(await page(path)).find(f=>f.includes('name="evaluationId"'))!;
  await post(path,current,{sellingPrice__value:"30",supplierPrice__value:"9.99"});
  const rejectedQuote=await post(quotePath,quoteForm,{confirmed:"on"});assert.ok(rejectedQuote.includes("another window"));
  assert.equal((await prisma.costInput.findUniqueOrThrow({where:{evaluationId_key:{evaluationId:evaluation.id,key:"supplierPrice"}}})).value,999);
  const oldManual=forms(await page(path)).find(f=>f.includes('name="evaluationId"'))!;
  const freshQuote=forms(await page(quotePath)).find(f=>f.includes('name="quoteId"'))!;
  assert.ok((await post(quotePath,freshQuote,{confirmed:"on"})).includes("Applied as estimates"));
  assert.ok((await post(path,oldManual,{supplierPrice__value:"88"})).includes("another window"));
  assert.equal((await prisma.costInput.findUniqueOrThrow({where:{evaluationId_key:{evaluationId:evaluation.id,key:"supplierPrice"}}})).value,100);
  console.log("PASS: concurrent saves have one winner, missing versions fail closed, tax changes invalidate edits, stale market save has no route/evidence side effects, stale quote cannot overwrite edits and quote application blocks old manual forms");
 }finally{if(listingId)await prisma.sourceListing.delete({where:{id:listingId}});await prisma.opportunity.delete({where:{id:product.id}});await prisma.market.delete({where:{id:market.id}});}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Conflict checks failed");process.exitCode=1;}).finally(async()=>{await cleanupTestSessions();await prisma.$disconnect();});
