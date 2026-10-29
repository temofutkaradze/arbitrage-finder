import { authenticatedFetch, cleanupTestSessions } from "./test-auth";
import { prisma } from "../src/lib/db/prisma";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { INPUT_DEFS } from "../src/lib/profit/types";
import { captureEvaluation, historyData } from "../src/lib/finance-history/write";
import { readSnapshot, snapshotChanges } from "../src/lib/finance-history/view";
const origin="http://127.0.0.1:3000", tag=randomUUID();
const decode=(s:string)=>s.replaceAll("&quot;",'"').replaceAll("&amp;","&").replaceAll("&#x27;","'");
const forms=(s:string)=>[...s.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(m=>m[1]);
async function page(path:string){const r=await authenticatedFetch(origin+path);assert.equal(r.status,200);return r.text();}
async function post(path:string,form:string,values:Record<string,string>){const data=new FormData();for(const m of form.matchAll(/<input\b[^>]*>/g)){if(!m[0].includes('type="hidden"'))continue;const k=m[0].match(/name="([^"]*)"/)?.[1],v=m[0].match(/value="([^"]*)"/)?.[1]??"";if(k)data.append(decode(k),decode(v));}for(const[k,v]of Object.entries(values))data.set(k,v);const r=await authenticatedFetch(origin+path,{method:"POST",headers:{Origin:origin},body:data});assert.equal(r.status,200);return {body:await r.text(),url:r.url};}
async function main(){
 let marketId:number|undefined,productId:number|undefined,listingId:number|undefined;
 try{
  const anon=await fetch(origin+"/history",{redirect:"manual"});assert.equal(anon.status,307);assert.equal(anon.headers.get("location"),"/login");
  const marketForm=forms(await page("/markets")).find(f=>f.includes('name="code"'));assert.ok(marketForm);
  const code=`H${tag.slice(0,8)}`.toUpperCase();await post("/markets",marketForm,{code,name:"HISTORY TEST FIXTURE",currency:"USD",countryCode:"US"});
  marketId=(await prisma.market.findUniqueOrThrow({where:{code}})).id;
  assert.equal(await prisma.financialChange.count({where:{marketId,kind:"MARKET_CREATED",version:0}}),1);
  const creation=forms(await page("/opportunities/new")).find(f=>f.includes('name="notes"'));assert.ok(creation);
  const created=await post("/opportunities/new",creation,{name:`HISTORY TEST FIXTURE ${tag}`,notes:"Temporary history fixture",markets:String(marketId)});
  const product=await prisma.opportunity.findFirstOrThrow({where:{name:`HISTORY TEST FIXTURE ${tag}`}});productId=product.id;assert.ok(created.url.endsWith(`/opportunities/${product.id}`));
  const evaluation=await prisma.evaluation.findUniqueOrThrow({where:{opportunityId_marketId:{opportunityId:product.id,marketId}}});
  const path=`/opportunities/${product.id}`,filter={evaluationId:evaluation.id};
  assert.equal(await prisma.financialChange.count({where:{...filter,kind:"EVALUATION_CREATED",version:0}}),1);
  const initial=forms(await page(path)).find(f=>f.includes('name="evaluationId"'));assert.ok(initial);
  const values:Record<string,string>=Object.fromEntries(INPUT_DEFS.filter(d=>d.essential).flatMap(d=>[[`${d.key}__value`,"0"],[`${d.key}__status`,"ESTIMATED"]]));
  Object.assign(values,{sellingPrice__value:"100",supplierPrice__value:"10",shippingToCustomer__value:"5",cac__value:"10",taxRate__value:"18",supplierPrice__note:"Manual source #1"});
  assert.ok((await post(path,initial,values)).body.includes("Inputs saved."));
  let audit=await prisma.financialChange.findUniqueOrThrow({where:{scope_recordId_version:{scope:"EVALUATION",recordId:evaluation.id,version:1}}});
  assert.equal(audit.kind,"MANUAL_INPUTS");let after=readSnapshot(audit.after)!;assert.equal(after.inputs?.find(i=>i.key==="supplierPrice")?.value,1000);
  assert.equal((after.calculated as {netProfit:number}).netProfit,7500);
  const revised=forms(await page(path)).find(f=>f.includes('name="evaluationId"'))!;
  Object.assign(values,{supplierPrice__status:"VERIFIED",supplierPrice__note:"Manually checked source #2"});await post(path,revised,values);
  audit=await prisma.financialChange.findUniqueOrThrow({where:{scope_recordId_version:{scope:"EVALUATION",recordId:evaluation.id,version:2}}});
  assert.equal(snapshotChanges(readSnapshot(audit.before),readSnapshot(audit.after)!).length,1);
  const repeat=forms(await page(path)).find(f=>f.includes('name="evaluationId"'))!;await post(path,repeat,values);
  audit=await prisma.financialChange.findUniqueOrThrow({where:{scope_recordId_version:{scope:"EVALUATION",recordId:evaluation.id,version:3}}});
  assert.equal(snapshotChanges(readSnapshot(audit.before),readSnapshot(audit.after)!).length,0);
  const count=await prisma.financialChange.count({where:filter});assert.ok((await post(path,initial,values)).body.includes("another window"));assert.equal(await prisma.financialChange.count({where:filter}),count);
  const fresh=forms(await page(path)).find(f=>f.includes('name="evaluationId"'))!;
  await post(path,fresh,{...values,sellingPrice__value:"9999999999999"});assert.equal(await prisma.financialChange.count({where:filter}),count);
  // Deliberately reserve the next audit key: failure to append must roll back money and version.
  const before=await prisma.$transaction(tx=>captureEvaluation(tx,evaluation.id));
  const fake=await prisma.financialChange.create({data:historyData("TEST_RESERVED_SLOT",before,{...before,version:4},{test:true})});
  await post(path,fresh,{...values,sellingPrice__value:"200"});
  assert.equal((await prisma.evaluation.findUniqueOrThrow({where:{id:evaluation.id}})).version,3);
  assert.equal((await prisma.costInput.findUniqueOrThrow({where:{evaluationId_key:{evaluationId:evaluation.id,key:"sellingPrice"}}})).value,10000);
  await prisma.financialChange.delete({where:{id:fake.id}});
  const settings=forms(await page("/markets")).find(f=>f.includes(`name="marketId" value="${marketId}"`))!;
  await post("/markets",settings,{countryCode:"US",pricesIncludeTax:"on"});
  audit=await prisma.financialChange.findUniqueOrThrow({where:{scope_recordId_version:{scope:"EVALUATION",recordId:evaluation.id,version:4}}});
  assert.equal(audit.kind,"MARKET_CONTEXT");assert.equal(snapshotChanges(readSnapshot(audit.before),readSnapshot(audit.after)!).length,0);
  assert.equal((readSnapshot(audit.after)!.calculated as {netProfit:number}).netProfit,5975);
  const listing=await prisma.sourceListing.create({data:{provider:"cj",importedVia:"CJ_API",externalId:tag,name:"HISTORY QUOTE FIXTURE",url:"https://example.com",currency:"USD",priceMinor:300,observedAt:new Date(),opportunityId:product.id}});listingId=listing.id;
  const variant=await prisma.supplierVariant.create({data:{listingId,externalId:tag,name:"HISTORY QUOTE FIXTURE",priceMinor:300,origins:[{countryCode:"US",totalInventory:1,cjInventory:1,factoryInventory:0}],observedAt:new Date()}});
  const quote=await prisma.shippingQuote.create({data:{variantId:variant.id,marketId,originCountry:"US",destinationCountry:"US",postalCode:"10001",method:"HISTORY FIXTURE",productPriceMinor:300,productObservedAt:new Date(),shippingMinor:400,observedAt:new Date(),expiresAt:new Date(Date.now()+3600000)}});
  const quotePath=`/discovery/${listing.id}`,qform=forms(await page(quotePath)).find(f=>f.includes('name="quoteId"'))!;
  const beforeQuote=await prisma.$transaction(tx=>captureEvaluation(tx,evaluation.id));
  const quoteFailure=await prisma.financialChange.create({data:historyData("TEST_RESERVED_QUOTE",beforeQuote,{...beforeQuote,version:5},{test:true})});
  await post(quotePath,qform,{confirmed:"on"});
  assert.equal((await prisma.evaluation.findUniqueOrThrow({where:{id:evaluation.id}})).version,4);
  assert.equal((await prisma.costInput.findUniqueOrThrow({where:{evaluationId_key:{evaluationId:evaluation.id,key:"supplierPrice"}}})).value,1000);
  assert.equal(await prisma.evidence.count({where:{opportunityId:product.id}}),0);
  await prisma.financialChange.delete({where:{id:quoteFailure.id}});
  await post(quotePath,qform,{confirmed:"on"});
  audit=await prisma.financialChange.findUniqueOrThrow({where:{scope_recordId_version:{scope:"EVALUATION",recordId:evaluation.id,version:5}}});assert.equal(audit.kind,"CJ_QUOTE");assert.equal((audit.context as {quoteId:number}).quoteId,quote.id);
  assert.equal(readSnapshot(audit.before)!.inputs?.find(i=>i.key==="supplierPrice")?.status,"VERIFIED");assert.equal(readSnapshot(audit.after)!.inputs?.find(i=>i.key==="supplierPrice")?.status,"ESTIMATED");
  const mform=forms(await page("/markets")).find(f=>f.includes(`name="marketId" value="${marketId}"`))!;
  const beforeRoute=await prisma.$transaction(tx=>captureEvaluation(tx,evaluation.id));
  const routeFailure=await prisma.financialChange.create({data:historyData("TEST_RESERVED_ROUTE",beforeRoute,{...beforeRoute,version:6},{test:true})});
  const sourceEvidence=await prisma.evidence.findMany({where:{opportunityId:product.id},orderBy:{id:"asc"}});
  await post("/markets",mform,{countryCode:"GE",pricesIncludeTax:"on"});
  assert.equal((await prisma.market.findUniqueOrThrow({where:{id:marketId}})).countryCode,"US");
  assert.equal((await prisma.market.findUniqueOrThrow({where:{id:marketId}})).version,1);
  assert.equal((await prisma.evaluation.findUniqueOrThrow({where:{id:evaluation.id}})).version,5);
  assert.equal((await prisma.costInput.findUniqueOrThrow({where:{evaluationId_key:{evaluationId:evaluation.id,key:"supplierPrice"}}})).value,300);
  assert.deepEqual(await prisma.evidence.findMany({where:{opportunityId:product.id},orderBy:{id:"asc"}}),sourceEvidence);
  assert.equal(await prisma.financialChange.count({where:{scope:"MARKET",recordId:marketId,version:2}}),0);
  await prisma.financialChange.delete({where:{id:routeFailure.id}});
  await post("/markets",mform,{countryCode:"GE",pricesIncludeTax:"on"});
  audit=await prisma.financialChange.findUniqueOrThrow({where:{scope_recordId_version:{scope:"EVALUATION",recordId:evaluation.id,version:6}}});after=readSnapshot(audit.after)!;
  assert.equal(after.market.countryCode,"GE");assert.equal(after.inputs?.find(i=>i.key==="supplierPrice")?.value,null);assert.equal(after.inputs?.find(i=>i.key==="cac")?.value,1000);
  const html=await page(`/history?evaluation=${evaluation.id}`);for(const text of ["CJ quote-ის გამოყენება","OWNER_CONFIRMED_QUOTE","Manual source #1","Manually checked source #2","5975"])assert.ok(html.includes(text),text);
  for(const invalid of ["/history?evaluation=0","/history?before=abc","/history?market=1&evaluation=1"])assert.equal((await authenticatedFetch(origin+invalid)).status,404);
  // Populate clearly labelled fixture events to verify keyset pagination, then cascade-delete them.
  const current=await prisma.$transaction(tx=>captureEvaluation(tx,evaluation.id));
  await prisma.financialChange.createMany({data:Array.from({length:51},(_,i)=>historyData("TEST_PAGINATION",current,{...current,version:100+i},{test:true}))});
  const paginated=await page(`/history?evaluation=${evaluation.id}`);const older=paginated.match(/href="(\/history\?evaluation=[^"]*before=[^"]*)"/);assert.ok(older);assert.ok((await page(decode(older[1]))).includes("CJ quote-ის გამოყენება"));
  console.log("PASS: creation/manual/status/note/no-op history, rejected edits have no events, audit-write failure rolls back costs/version, saved tax calculations, quote provenance, selective route invalidation, protected paginated history and cascade cleanup");
 }finally{
  if(listingId)await prisma.sourceListing.delete({where:{id:listingId}});
  if(productId)await prisma.opportunity.delete({where:{id:productId}});
  if(marketId){await prisma.market.delete({where:{id:marketId}});assert.equal(await prisma.financialChange.count({where:{marketId}}),0);}
 }
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Financial history check failed");process.exitCode=1;}).finally(async()=>{await cleanupTestSessions();await prisma.$disconnect();});
