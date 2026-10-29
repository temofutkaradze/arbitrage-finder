import "dotenv/config";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {prisma} from "../src/lib/db/prisma";
import {saveExternalOffers} from "../src/lib/providers/offers";
const origin="http://127.0.0.1:3000",decode=(s:string)=>s.replaceAll("&quot;",'"').replaceAll("&amp;","&");
async function submit(path:string,html:string,marker:string,values:Record<string,string>){
 const form=[...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(m=>m[1]).find(f=>f.includes(marker));assert.ok(form);
 const data=new FormData();for(const m of form.matchAll(/<input\b[^>]*>/g)){if(!m[0].includes('type="hidden"'))continue;const n=m[0].match(/name="([^"]*)"/)?.[1],v=m[0].match(/value="([^"]*)"/)?.[1]??"";if(n)data.append(decode(n),decode(v));}
 for(const[k,v]of Object.entries(values))data.set(k,v);
 const r=await fetch(origin+path,{method:"POST",headers:{Origin:origin},body:data});assert.equal(r.status,200);return r.text();
}
async function main(){
 let productId:number|undefined,marketId:number|undefined;const tag=randomUUID();
 try{
  const p=await prisma.opportunity.create({data:{name:`TEST FIXTURE offers ${tag}`}});productId=p.id;
  const m=await prisma.market.create({data:{code:`O${tag.slice(0,8)}`,name:"TEST FIXTURE — not a chosen market",currency:"GBP",countryCode:"GB"}});marketId=m.id;
  await saveExternalOffers(productId,marketId,"GB",[{provider:"ebay",externalId:tag,title:"TEST FIXTURE offer",merchant:"TEST FIXTURE seller",url:`https://www.ebay.co.uk/itm/${tag}`,priceMinor:1234,currency:"GBP"}]);
  const offer=await prisma.externalOffer.findFirstOrThrow({where:{opportunityId:productId}}),path=`/research?product=${productId}&market=${marketId}`;
  let html=await(await fetch(origin+path)).text();assert.ok(html.includes("External offers awaiting comparison"));
  assert.equal(await prisma.competitorObservation.count({where:{opportunityId:productId}}),0);
  const result=await submit(path,html,`name="id" value="${offer.id}"`,{decision:"ACCEPT",match:"EQUIVALENT",comparison:"TEST FIXTURE confirmed pack size; shipping still unknown",shippingMinor:"",taxBasis:"UNKNOWN"});assert.ok(result.includes("Review saved"));
  const observation=await prisma.competitorObservation.findFirstOrThrow({where:{opportunityId:productId}});assert.equal(observation.shippingMinor,null);
  html=await(await fetch(origin+path)).text();assert.ok(html.includes("ACCEPTED"));
  const markets=await(await fetch(origin+"/markets")).text();await submit("/markets",markets,`name="marketId" value="${marketId}"`,{countryCode:"US"});
  const invalidated=await prisma.externalOffer.findUniqueOrThrow({where:{id:offer.id}});assert.equal(invalidated.state,"INVALIDATED");
  assert.ok((await prisma.competitorObservation.findUniqueOrThrow({where:{id:observation.id}})).expiresAt<=new Date());
  console.log("PASS: offer inbox, explicit review, unknown shipping and destination-change invalidation through production forms; no external provider requests");
 }finally{if(productId)await prisma.opportunity.delete({where:{id:productId}});if(marketId)await prisma.market.delete({where:{id:marketId}});}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Offer HTTP check failed");process.exitCode=1;}).finally(()=>prisma.$disconnect());
