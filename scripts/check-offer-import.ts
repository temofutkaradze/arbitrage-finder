import "./test-auth";
import { chromium } from "playwright";
import { newSession,configuredAuth,SESSION_COOKIE } from "../src/lib/auth/core";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db/prisma";
import { importPendingOffers } from "../src/lib/providers/import-offers";
import { reviewOffer } from "../src/lib/providers/offers";
import { authenticatedFetch,cleanupTestSessions } from "./test-auth";
async function main(){
 const tag=crypto.randomUUID();let productId:number|undefined,marketId:number|undefined;
 try{
  const p=await prisma.opportunity.create({data:{name:`IMPORT FIXTURE ${tag}`}});productId=p.id;
  const m=await prisma.market.create({data:{code:`IMP-${tag}`,name:"Import fixture",countryCode:"US",currency:"USD"}});marketId=m.id;
  const row={title:"Source fixture",merchant:"Seller",url:`https://example.com/${tag}`,priceMinor:1234,observedAt:new Date(Date.now()-120000).toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString()};
  const raw=(offers:unknown[])=>JSON.stringify({destinationCountry:"US",currency:"USD",offers});
  assert.deepEqual(await importPendingOffers(p.id,m.id,m.version,raw([row])),{created:1,updated:0,unchanged:0});
  assert.deepEqual(await importPendingOffers(p.id,m.id,m.version,raw([row])),{created:0,updated:0,unchanged:1});
  assert.equal(await prisma.competitorObservation.count({where:{opportunityId:p.id}}),0);
  await assert.rejects(importPendingOffers(p.id,m.id,m.version+1,raw([row])));
  const offer=await prisma.externalOffer.findFirstOrThrow({where:{opportunityId:p.id}});assert.equal(offer.state,"PENDING");assert.equal(offer.provider,"manual-json");
  await reviewOffer({id:offer.id,decision:"ACCEPT",match:"EQUIVALENT",comparison:"Manual fixture: reviewed model and pack with delivery still unknown.",shippingMinor:"",taxBasis:"UNKNOWN"});
  const old=await prisma.competitorObservation.findFirstOrThrow({where:{opportunityId:p.id}});assert.equal(old.shippingMinor,null);assert.ok(old.comparison.includes("manual-json"));
  const newer={...row,priceMinor:1500,observedAt:new Date(Date.now()-60000).toISOString()};
  assert.deepEqual(await importPendingOffers(p.id,m.id,m.version,raw([newer])),{created:0,updated:1,unchanged:0});
  assert.equal((await prisma.externalOffer.findUniqueOrThrow({where:{id:offer.id}})).state,"PENDING");assert.ok((await prisma.competitorObservation.findUniqueOrThrow({where:{id:old.id}})).expiresAt<=new Date());
  // First row would create; the conflicting second row must roll it back.
  await assert.rejects(importPendingOffers(p.id,m.id,m.version,raw([{...newer,url:`https://example.com/new-${tag}`},{...newer,priceMinor:1600}])));
  assert.equal(await prisma.externalOffer.count({where:{opportunityId:p.id}}),1);
  await assert.rejects(importPendingOffers(p.id,m.id,m.version,raw([row])));
  const path=`http://127.0.0.1:3000/research?product=${p.id}&market=${m.id}`;
  assert.equal((await fetch(path,{redirect:"manual"})).status,307);const page=await authenticatedFetch(path);assert.equal(page.status,200);assert.ok((await page.text()).includes("შეთავაზებების ერთიანი JSON შემოტანა"));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:["--no-sandbox"]});
  const session=newSession();
  try{
   await prisma.ownerSession.create({data:{id:session.id,passwordVersion:configuredAuth().version,expiresAt:session.expiresAt}});
   const context=await browser.newContext();context.setDefaultTimeout(20000);context.setDefaultNavigationTimeout(20000);
   await context.addCookies([{name:SESSION_COOKIE,value:session.token,url:"http://127.0.0.1:3000"}]);const page=await context.newPage();await page.goto(path);
   await page.getByText("შეთავაზებების ერთიანი JSON შემოტანა — გადახედვის რიგში",{exact:true}).click();
   const field=page.getByLabel("შეთავაზებების JSON",{exact:true});await field.fill("not json");await page.getByRole("button",{name:"პაკეტის გადახედვა",exact:true}).click();
   await page.getByRole("alert").filter({hasText:"შეამოწმე ფორმატი"}).waitFor();
   const browserRaw=raw([{...newer,url:`https://example.com/browser-${tag}`}]);
   await field.fill(browserRaw);await page.getByRole("button",{name:"პაკეტის გადახედვა",exact:true}).click();
   const save=page.getByRole("button",{name:"შეინახე გადახედვის რიგში",exact:true});await save.waitFor();
   await field.fill(browserRaw+" ");assert.equal(await save.count(),0);
   await page.getByRole("button",{name:"პაკეტის გადახედვა",exact:true}).click();
   await page.getByRole("checkbox",{name:"მაქვს მონაცემების გამოყენების უფლება"}).check();await save.click();
   await page.getByRole("status").filter({hasText:"შესადარებლად:"}).waitFor();
   assert.equal(await prisma.externalOffer.count({where:{opportunityId:p.id,provider:"manual-json",state:"PENDING"}}),2);
   assert.equal(await prisma.competitorObservation.count({where:{opportunityId:p.id}}),1);
  }finally{await browser.close();await prisma.ownerSession.deleteMany({where:{id:session.id}});}
  await prisma.externalOffer.createMany({data:Array.from({length:40},(_,i)=>({opportunityId:p.id,marketId:m.id,provider:"page-fixture",externalId:`${tag}-${i}`,title:`Page item ${i}`,merchant:"Fixture seller",url:`https://example.com/page-${tag}-${i}`,priceMinor:100,currency:"USD",destinationCountry:"US",observedAt:new Date(),expiresAt:new Date(Date.now()+3600000)}))});
  const firstPage=await (await authenticatedFetch(path)).text();assert.ok(firstPage.includes("შემდეგი შეთავაზებები"));
  const forty=await prisma.externalOffer.findMany({where:{opportunityId:p.id,marketId:m.id},orderBy:{id:"desc"},take:40});
  const nextPage=await (await authenticatedFetch(path+`&offerBefore=${forty.at(-1)!.id}`)).text();assert.ok(nextPage.includes("Source fixture"));
  assert.equal((await authenticatedFetch(path+"&offerBefore=bad")).status,404);
  console.log("PASS: pending-only bulk import, idempotency, version guard, explicit review, superseded observation expiry, transaction rollback and owner-only UI");
 }finally{if(productId)await prisma.opportunity.deleteMany({where:{id:productId}});if(marketId)await prisma.market.deleteMany({where:{id:marketId}});await cleanupTestSessions();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Offer import check failed");process.exitCode=1;}).finally(()=>prisma.$disconnect());
