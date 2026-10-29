import {authenticatedFetch as fetch,cleanupTestSessions} from "./test-auth";
import "dotenv/config";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {prisma} from "../src/lib/db/prisma";
import {convertUsdMinor} from "../src/lib/sourcing/convert";
import {validRateDate} from "../src/lib/fx/reference";
const origin="http://127.0.0.1:3000";
const decode=(s:string)=>s.replaceAll("&quot;",'"').replaceAll("&amp;","&");
const forms=(s:string)=>[...s.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(m=>m[1]);
async function page(path:string){const r=await fetch(origin+path);assert.equal(r.status,200);return r.text();}
async function submit(path:string,form:string,values:Record<string,string>){
 const data=new FormData();for(const m of form.matchAll(/<input\b[^>]*>/g)){if(!m[0].includes('type="hidden"'))continue;const n=m[0].match(/name="([^"]*)"/)?.[1],v=m[0].match(/value="([^"]*)"/)?.[1]??"";if(n)data.append(decode(n),decode(v));}
 for(const[k,v]of Object.entries(values))data.set(k,v);
 const r=await fetch(origin+path,{method:"POST",headers:{Origin:origin},body:data});assert.equal(r.status,200);return r.text();
}
async function main(){
 let productId:number|undefined,marketId:number|undefined,listingId:number|undefined;const tag=randomUUID();
 try{
  const markets=await page("/markets");assert.ok(markets.includes("Official reference FX"));
  if(process.argv.includes("--refresh")){
   const form=forms(markets).find(f=>f.includes("One date-scoped request"));assert.ok(form);
   const refreshed=await submit("/markets",form,{});assert.ok(refreshed.includes("Saved 6 official reference rates"));
   const repeated=await submit("/markets",form,{});assert.ok(repeated.includes("wait ten minutes"));
  }
  const rates=await prisma.fxSnapshot.findMany({where:{provider:"NBG"},orderBy:[{rateDate:"desc"},{retrievedAt:"desc"}]});
  const gbp=rates.find(r=>r.currency==="GBP"&&validRateDate(r.rateDate)),eur=rates.find(r=>r.currency==="EUR"&&validRateDate(r.rateDate));assert.ok(gbp);assert.ok(eur);
  const product=await prisma.opportunity.create({data:{name:`TEST FIXTURE FX ${tag}`,isSample:true}});productId=product.id;
  const market=await prisma.market.create({data:{code:`F${tag.slice(0,8)}`,name:"TEST FIXTURE FX — not a chosen market",currency:"GBP",countryCode:"GB"}});marketId=market.id;
  const listing=await prisma.sourceListing.create({data:{provider:"cj",externalId:`test-${tag}`,name:"TEST FIXTURE FX",url:"https://example.com/fixture",currency:"USD",observedAt:new Date(),importedVia:"CJ_API",opportunityId:productId}});listingId=listing.id;
  const variant=await prisma.supplierVariant.create({data:{listingId,externalId:tag,name:"TEST FIXTURE FX",priceMinor:123,origins:[],observedAt:new Date()}});
  const evaluation=await prisma.evaluation.create({data:{opportunityId:productId,marketId}});
  const quote=await prisma.shippingQuote.create({data:{variantId:variant.id,marketId,originCountry:"CN",destinationCountry:"GB",postalCode:"SW1A 1AA",method:"TEST FIXTURE FX",productPriceMinor:123,productObservedAt:new Date(),shippingMinor:456,observedAt:new Date(),expiresAt:new Date(Date.now()+86400000)}});
  const path=`/discovery/${listingId}`;const html=await page(path);const form=forms(html).find(f=>f.includes(`name="quoteId" value="${quote.id}"`));assert.ok(form);assert.ok(form.includes('name="fxSnapshotId"'));
  let response=await submit(path,form,{confirmed:"on",fxSnapshotId:String(eur.id)});assert.ok(response.includes("currency or effective date"));
  assert.equal(await prisma.costInput.count({where:{evaluationId:evaluation.id}}),0);
  response=await submit(path,form,{confirmed:"on",fxSnapshotId:String(gbp.id)});assert.ok(response.includes("Applied as estimates"));
  const inputs=await prisma.costInput.findMany({where:{evaluationId:evaluation.id}});
  assert.equal(inputs.find(i=>i.key==="supplierPrice")?.value,convertUsdMinor(123,gbp.rate));
  assert.equal(inputs.find(i=>i.key==="shippingToCustomer")?.value,convertUsdMinor(456,gbp.rate));
  assert.ok(inputs.find(i=>i.key==="supplierPrice")?.note?.includes(`snapshot #${gbp.id}`));
  assert.equal(inputs.find(i=>i.key==="importDutyPct")?.status,"UNKNOWN");
  console.log("PASS: official FX display, reference selection, currency mismatch rejection and dated provenance through production forms");
 }finally{if(listingId)await prisma.sourceListing.delete({where:{id:listingId}});if(productId)await prisma.opportunity.delete({where:{id:productId}});if(marketId)await prisma.market.delete({where:{id:marketId}});}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"FX HTTP verification failed");process.exitCode=1;}).finally(async()=>{await cleanupTestSessions();await prisma.$disconnect();});
