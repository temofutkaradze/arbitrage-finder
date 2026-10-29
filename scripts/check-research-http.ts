import {authenticatedFetch as fetch,cleanupTestSessions} from "./test-auth";
import "dotenv/config";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {prisma} from "../src/lib/db/prisma";
import {researchReadiness} from "../src/lib/research/readiness";
const origin="http://127.0.0.1:3000";
const decode=(s:string)=>s.replaceAll("&quot;",'"').replaceAll("&amp;","&");
async function submit(path:string,html:string,marker:string,values:Record<string,string>){
 const form=[...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(m=>m[1]).find(f=>f.includes(marker));assert.ok(form);
 const data=new FormData();for(const m of form.matchAll(/<input\b[^>]*>/g)){if(!m[0].includes('type="hidden"'))continue;const n=m[0].match(/name="([^"]*)"/)?.[1],v=m[0].match(/value="([^"]*)"/)?.[1]??"";if(n)data.append(decode(n),decode(v));}
 for(const[k,v]of Object.entries(values))data.set(k,v);
 const response=await fetch(origin+path,{method:"POST",headers:{Origin:origin},body:data});assert.equal(response.status,200);return response.text();
}
async function main(){
 let productId:number|undefined,marketId:number|undefined;const tag=randomUUID();
 try{
  const product=await prisma.opportunity.create({data:{name:`TEST FIXTURE research ${tag}`}});productId=product.id;
  const market=await prisma.market.create({data:{code:`R${tag.slice(0,8)}`,name:"TEST FIXTURE technical market",currency:"GBP"}});marketId=market.id;
  const evidence=await prisma.evidence.create({data:{opportunityId:productId,kind:"PRODUCT_RISK",provenance:"OBSERVED",outcome:"CONCERN",summary:"TEST FIXTURE concern, not a real product risk",url:"https://example.com/test",observedAt:new Date(),expiresAt:new Date(Date.now()+86400000)}});
  const path=`/research?product=${productId}&market=${marketId}`;
  let html=await(await fetch(origin+path)).text();assert.ok(html.includes("Research workbench"));
  const fields={merchant:"TEST FIXTURE seller",url:"https://example.com/fixture",match:"EXACT",comparison:"TEST FIXTURE: same dimensions and pack size, displayed offer only",priceMinor:"1234",shippingMinor:"",taxBasis:"INCLUDED",observedAt:new Date().toISOString().slice(0,10),expiresAt:new Date(Date.now()+86400000).toISOString().slice(0,10)};
  let response=await submit(path,html,'name="merchant"',{...fields,currency:"USD"});assert.ok(response.includes("Not saved."));
  assert.equal(await prisma.competitorObservation.count({where:{opportunityId:productId}}),0);
  response=await submit(path,html,'name="merchant"',fields);assert.ok(response.includes("Competitor observation saved."));
  const row=await prisma.competitorObservation.findFirstOrThrow({where:{opportunityId:productId}});assert.equal(row.shippingMinor,null);assert.equal(row.priceMinor,1234);
  response=await submit(path,html,'name="merchant"',fields);assert.ok(response.includes("Not saved."));
  html=await(await fetch(origin+path)).text();assert.ok(html.includes("TEST FIXTURE seller"));
  assert.equal(researchReadiness([evidence],marketId).label,"Risk review");
  response=await submit(path,html,`name="id" value="${evidence.id}"`,{note:"TEST FIXTURE retired following a documented correction"});assert.ok(response.includes("Record retired"));
  const retired=await prisma.evidence.findUniqueOrThrow({where:{id:evidence.id}});assert.ok(retired.resolvedAt);assert.equal(researchReadiness([retired],marketId).label,"Needs research");
  console.log("PASS: research HTTP observations, currency rejection, unknown shipping, duplicate protection and evidence retirement/readiness");
 }finally{if(productId)await prisma.opportunity.delete({where:{id:productId}});if(marketId)await prisma.market.delete({where:{id:marketId}});}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Research check failed");process.exitCode=1;}).finally(async()=>{await cleanupTestSessions();await prisma.$disconnect();});
