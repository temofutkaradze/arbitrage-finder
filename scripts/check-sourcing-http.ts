import {authenticatedFetch as fetch,cleanupTestSessions} from "./test-auth";
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
import { originsSchema } from "../src/lib/sourcing/schema";
const origin="http://127.0.0.1:3000";
const decode=(s:string)=>s.replaceAll("&quot;",'"').replaceAll("&amp;","&").replaceAll("&#x27;", "'");
const forms=(s:string)=>[...s.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(m=>m[1]);
async function page(path:string) {
 const r=await fetch(origin+path);assert.equal(r.status,200);return r.text();
}
async function submit(path:string,form:string,values:Record<string,string>) {
 const data=new FormData();
 for(const match of form.matchAll(/<input\b[^>]*>/g)) {
  const input=match[0];if(!input.includes('type="hidden"'))continue;
  const name=input.match(/name="([^"]*)"/)?.[1],value=input.match(/value="([^"]*)"/)?.[1]??"";
  if(name)data.append(decode(name),decode(value));
 }
 for(const [key,value] of Object.entries(values))data.set(key,value);
 const r=await fetch(origin+path,{method:"POST",headers:{Origin:origin},body:data});assert.equal(r.status,200);return r.text();
}
async function main() {
 const tag=randomUUID();let listingId:number|undefined,opportunityId:number|undefined,marketId:number|undefined;
 try {
  const market=await prisma.market.create({data:{code:`H${tag.slice(0,8)}`,name:"HTTP TEST — not a selected market",countryCode:"GB",currency:"USD"}});marketId=market.id;
  const opportunity=await prisma.opportunity.create({data:{name:"HTTP TEST — removed after verification",isSample:true}});opportunityId=opportunity.id;
  const listing=await prisma.sourceListing.create({data:{provider:"cj",externalId:`test-${tag}`,name:"HTTP TEST FIXTURE",url:"https://example.com/test",currency:"USD",priceMinor:123,importedVia:"CJ_API",observedAt:new Date(),opportunityId}});listingId=listing.id;
  const variant=await prisma.supplierVariant.create({data:{listingId,externalId:`test-${tag}`,name:"HTTP TEST VARIANT",priceMinor:123,origins:[],observedAt:new Date()}});
  const evaluation=await prisma.evaluation.create({data:{opportunityId,marketId}});
  const quote=await prisma.shippingQuote.create({data:{variantId:variant.id,marketId,originCountry:"CN",destinationCountry:"GB",postalCode:"SW1A 1AA",method:"HTTP TEST METHOD",productPriceMinor:123,productObservedAt:new Date(),shippingMinor:456,observedAt:new Date(),expiresAt:new Date(Date.now()+86400000)}});
  const html=await page(`/discovery/${listingId}`);assert.ok(html.includes("HTTP TEST METHOD"));
  const form=forms(html).find(f=>f.includes(`name="quoteId" value="${quote.id}"`));assert.ok(form);
  await submit(`/discovery/${listingId}`,form,{});
  assert.equal(await prisma.costInput.count({where:{evaluationId:evaluation.id}}),0);
  const applied=await submit(`/discovery/${listingId}`,form,{confirmed:"on"});assert.ok(applied.includes("Applied as estimates"));
  const inputs=await prisma.costInput.findMany({where:{evaluationId:evaluation.id}});
  assert.equal(inputs.find(i=>i.key==="supplierPrice")?.value,123);
  assert.equal(inputs.find(i=>i.key==="shippingToCustomer")?.value,456);
  assert.equal(inputs.find(i=>i.key==="importDutyPct")?.status,"UNKNOWN");
  assert.ok((await page(`/opportunities/${opportunityId}`)).includes("missing required inputs"));
  assert.ok((await page("/markets")).includes('name="countryCode"'));
  const marketHtml=await page("/markets");const marketForm=forms(marketHtml).find(f=>f.includes(`name="marketId" value="${marketId}"`));assert.ok(marketForm);
  await submit("/markets",marketForm,{countryCode:"US"});
  const invalidated=await prisma.costInput.findMany({where:{evaluationId:evaluation.id}});
  assert.ok(invalidated.every(i=>i.status==="UNKNOWN"&&i.value===null));
  assert.ok((await prisma.evidence.findMany({where:{opportunityId}})).every(e=>e.expiresAt<=new Date()));
  await prisma.market.update({where:{id:marketId},data:{countryCode:"GB"}});
  console.log("PASS: sourcing page, explicit confirmation, quote application, duty review, destination-change invalidation and incomplete-profit rendering through production HTTP forms");
  if(process.argv.includes("--live-freight")) {
    // Explicit opt-in performs ONE read-only real freight estimate. The market
    // is a temporary technical fixture, never a selected commercial market.
    const variants=await prisma.supplierVariant.findMany({where:{active:true,listing:{provider:"cj",importedVia:"CJ_API",externalId:{not:`test-${tag}`}}}});
    const live=variants.find(v=>Date.now()-v.observedAt.getTime()<86400000&&originsSchema.parse(v.origins).some(o=>(o.totalInventory??0)>0));assert.ok(live,"Refresh a real CJ variant before the optional live check");
    const stockOrigin=originsSchema.parse(live.origins).find(o=>(o.totalInventory??0)>0)!;
    const liveHtml=await page(`/discovery/${live.listingId}`);
    const quoteForm=forms(liveHtml).find(f=>f.includes(`name="variantId" value="${live.id}"`));assert.ok(quoteForm);
    const response=await submit(`/discovery/${live.listingId}`,quoteForm,{originCountry:stockOrigin.countryCode,marketId:String(marketId),postalCode:"SW1A 1AA"});
    assert.ok(/Saved \d+ shipping estimates/.test(response),"No live shipping success message");
    const saved=await prisma.shippingQuote.findMany({where:{marketId,variantId:live.id}});assert.ok(saved.length>0);
    assert.ok(saved.every(q=>q.destinationCountry==="GB"&&q.productObservedAt&&q.shippingMinor>=0));
    console.log(`PASS: live CJ freight form saved ${saved.length} route estimates; temporary market and estimates are removed below`);
  }
 } finally {
  if(marketId)await prisma.shippingQuote.deleteMany({where:{marketId}});
  if(listingId)await prisma.sourceListing.delete({where:{id:listingId}});
  if(opportunityId)await prisma.opportunity.delete({where:{id:opportunityId}});
  if(marketId)await prisma.market.delete({where:{id:marketId}});
 }
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Sourcing HTTP check failed");process.exitCode=1;}).finally(async()=>{await cleanupTestSessions();await prisma.$disconnect();});
