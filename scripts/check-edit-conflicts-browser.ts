import "./test-auth";
import { chromium, type Page } from "playwright";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
import { newSession, configuredAuth, SESSION_COOKIE } from "../src/lib/auth/core";
async function submit(page:Page,label:string){const response=page.waitForResponse(r=>r.request().method()==="POST");await page.getByRole("button",{name:label,exact:true}).click();await response;}
async function main(){
 const tag=randomUUID(),session=newSession(),market=await prisma.market.create({data:{code:`V${tag.slice(0,8)}`,name:"VERSION BROWSER FIXTURE",countryCode:"US",currency:"USD"}});
 const product=await prisma.opportunity.create({data:{name:"VERSION BROWSER FIXTURE",isSample:true}});
 const evaluation=await prisma.evaluation.create({data:{opportunityId:product.id,marketId:market.id}});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:["--no-sandbox"]});
 try{
  await prisma.ownerSession.create({data:{id:session.id,passwordVersion:configuredAuth().version,expiresAt:session.expiresAt}});
  const context=await browser.newContext();context.setDefaultTimeout(20000);context.setDefaultNavigationTimeout(20000);await context.addCookies([{name:SESSION_COOKIE,value:session.token,url:"http://127.0.0.1:3000"}]);
  const a=await context.newPage(),b=await context.newPage(),url=`http://127.0.0.1:3000/opportunities/${product.id}`;
  console.log("Conflict browser: opening two finance tabs");
  await a.goto(url);await b.goto(url);
  await a.locator('[name="sellingPrice__value"]').fill("10");await submit(a,"Save inputs");
  await a.waitForFunction(()=>document.querySelector<HTMLInputElement>('[name="expectedVersion"]')?.value==="1");
  await a.locator('[name="sellingPrice__value"]').fill("12");await submit(a,"Save inputs");
  await a.waitForFunction(()=>document.querySelector<HTMLInputElement>('[name="expectedVersion"]')?.value==="2");
  console.log("Conflict browser: checking stale finance tab");
  await b.locator('[name="sellingPrice__value"]').fill("20");await b.locator('[name="sellingPrice__note"]').fill("Unsaved conflict note must remain available.");await submit(b,"Save inputs");
  await b.getByRole("status").filter({hasText:"another window"}).waitFor();
  assert.equal(await b.locator('[name="sellingPrice__value"]').inputValue(),"20");assert.equal(await b.locator('[name="expectedVersion"]').inputValue(),"0");
  assert.ok((await b.locator('[name="sellingPrice__note"]').inputValue()).includes("Unsaved conflict note"));
  const link=b.getByRole("link",{name:"Open latest saved version in a new tab"});assert.equal(await link.getAttribute("target"),"_blank");
  await submit(b,"Save inputs");assert.equal((await prisma.costInput.findUniqueOrThrow({where:{evaluationId_key:{evaluationId:evaluation.id,key:"sellingPrice"}}})).value,1200);
  // A fresh finance tab must also conflict after market tax/route context changes.
  console.log("Conflict browser: checking market tabs and finance invalidation");
  const financial=await context.newPage();await financial.goto(url);
  const ma=await context.newPage(),mb=await context.newPage();await ma.goto("http://127.0.0.1:3000/markets");await mb.goto("http://127.0.0.1:3000/markets");
  for(const p of [ma,mb])await p.locator(`form:has(input[name="marketId"][value="${market.id}"])`).locator("..").evaluate(e=>{if(e instanceof HTMLDetailsElement)e.open=true;});
  const fa=ma.locator(`form:has(input[name="marketId"][value="${market.id}"])`),fb=mb.locator(`form:has(input[name="marketId"][value="${market.id}"])`);
  await fa.locator('[name="countryCode"]').fill("CA");await submit(ma,"Save market assumptions");
  await fa.locator('[name="expectedVersion"][value="1"]').waitFor({state:"attached"});
  await fb.locator('[name="countryCode"]').fill("GE");await submit(mb,"Save market assumptions");await fb.getByRole("status").filter({hasText:"another window"}).waitFor();
  assert.equal(await fb.locator('[name="countryCode"]').inputValue(),"GE");assert.equal(await fb.locator('[name="expectedVersion"]').inputValue(),"0");
  assert.equal((await prisma.market.findUniqueOrThrow({where:{id:market.id}})).countryCode,"CA");
  await financial.locator('[name="sellingPrice__value"]').fill("33");await submit(financial,"Save inputs");await financial.getByRole("status").filter({hasText:"another window"}).waitFor();
  assert.equal((await prisma.costInput.findUniqueOrThrow({where:{evaluationId_key:{evaluationId:evaluation.id,key:"sellingPrice"}}})).value,1200);
  console.log("PASS: two finance tabs preserve winning data, stale entries/notes/base version survive conflict and repeat attempts, successful saves advance own baseline, market tabs conflict and route changes invalidate finance tabs");
 }finally{await browser.close();await prisma.opportunity.delete({where:{id:product.id}});await prisma.market.delete({where:{id:market.id}});await prisma.ownerSession.deleteMany({where:{id:session.id}});}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Browser conflict check failed");process.exitCode=1;}).finally(()=>prisma.$disconnect());
