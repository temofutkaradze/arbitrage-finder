import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
const origin="http://127.0.0.1:3000";
const decode=(s:string)=>s.replaceAll("&quot;",'"').replaceAll("&amp;","&").replaceAll("&#x27;", "'");
const forms=(s:string)=>[...s.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(m=>m[1]);
async function page(path:string) {
 const response=await fetch(origin+path);assert.equal(response.status,200);return response.text();
}
async function submit(path:string,form:string,values:Record<string,string>) {
 const data=new FormData();
 for(const match of form.matchAll(/<input\b[^>]*>/g)) {
  const input=match[0];if(!input.includes('type="hidden"'))continue;
  const name=input.match(/name="([^"]*)"/)?.[1];const value=input.match(/value="([^"]*)"/)?.[1]??"";
  if(name)data.append(decode(name),decode(value));
 }
 for(const [key,value] of Object.entries(values))data.set(key,value);
 const response=await fetch(origin+path,{method:"POST",headers:{Origin:origin},body:data});
 assert.equal(response.status,200);return {body:await response.text(),url:response.url};
}
async function main() {
 const externalId=randomUUID();const provider=`http-test-${externalId.slice(0,8)}`;
 let opportunityId:number|undefined;
 try {
  const html=await page("/discovery");
  const form=forms(html).find(f=>f.includes('name="catalogue"'));assert.ok(form);
  const input={provider,externalId,name:`HTTP TEST FIXTURE ${externalId}`,url:"https://example.com/test",currency:"USD",priceMinor:1234,observedAt:new Date(Date.now()-10000).toISOString()};
  const response=await submit("/discovery",form,{catalogue:JSON.stringify([input])});
  assert.ok(response.body.includes("1 new"));
  const second=await submit("/discovery",form,{catalogue:JSON.stringify([input])});assert.ok(second.body.includes("1 unchanged"));
  const listing=await prisma.sourceListing.findUniqueOrThrow({where:{provider_externalId_variantId:{provider,externalId,variantId:""}}});
  const selection=forms(await page("/discovery")).find(f=>f.includes(`name="listingId" value="${listing.id}"`));assert.ok(selection);
  const selected=await submit("/discovery",selection,{});
  const current=await prisma.sourceListing.findUniqueOrThrow({where:{id:listing.id}});opportunityId=current.opportunityId??undefined;assert.ok(opportunityId);
  assert.ok(selected.url.endsWith(`/opportunities/${opportunityId}`));
  assert.ok(selected.body.includes("Research evidence"));
  const evidenceForm=forms(selected.body).find(f=>f.includes('name="summary"'));assert.ok(evidenceForm);
  const result=await submit(`/opportunities/${opportunityId}`,evidenceForm,{kind:"SOURCING",provenance:"ASSUMPTION",outcome:"INCONCLUSIVE",marketId:"",observedAt:new Date().toISOString().slice(0,10),expiresAt:new Date(Date.now()+86400000).toISOString().slice(0,10),summary:"Temporary HTTP fixture: not real supplier evidence.",url:"https://example.com/test"});
  assert.ok(result.body.includes("Evidence recorded."));
  assert.equal(await prisma.evidence.count({where:{opportunityId}}),1);
  assert.ok((await page(`/opportunities/${opportunityId}`)).includes("Temporary HTTP fixture"));
  console.log("PASS: production HTTP import, repeat import, candidate promotion, detail rendering and evidence form persistence");
 } finally {
  if(opportunityId)await prisma.opportunity.delete({where:{id:opportunityId}});
  await prisma.sourceListing.deleteMany({where:{provider,externalId}});
  await prisma.importRun.deleteMany({where:{source:`json:${provider}`}});
 }
}
main().catch((e)=>{console.error(e instanceof Error ? e.message : "HTTP check failed");process.exitCode=1;}).finally(()=>prisma.$disconnect());
