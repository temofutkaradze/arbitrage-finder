import "./test-auth";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
import { newSession, configuredAuth, SESSION_COOKIE } from "../src/lib/auth/core";
async function main(){
 const tag=randomUUID().slice(0,8),code=`F${tag}`.toUpperCase(),name=`FORM FIXTURE ${tag}`,session=newSession();
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:["--no-sandbox"]});
 let marketId:number|undefined;
 await prisma.ownerSession.create({data:{id:session.id,passwordVersion:configuredAuth().version,expiresAt:session.expiresAt}});
 try{
  const context=await browser.newContext();context.setDefaultTimeout(20000);context.setDefaultNavigationTimeout(20000);await context.addCookies([{name:SESSION_COOKIE,value:session.token,url:"http://127.0.0.1:3000"}]);const page=await context.newPage();
  await page.goto("http://127.0.0.1:3000/markets");
  const form=page.locator("form").filter({has:page.locator('[name="code"]')});
  await form.locator('[name="code"]').fill("_");await form.locator('[name="name"]').fill(name);await form.getByRole("button").click();
  await form.getByRole("status").filter({hasText:"Check the required"}).waitFor();
  assert.equal(await form.locator('[name="name"]').inputValue(),name);assert.equal(await prisma.market.count({where:{name}}),0);
  await form.locator('[name="code"]').fill(code);
  await form.evaluate(f=>{if(f instanceof HTMLFormElement){f.requestSubmit();f.requestSubmit();}});
  await form.getByRole("status").filter({hasText:"Market created"}).waitFor();
  assert.equal(await prisma.market.count({where:{code}}),1);marketId=(await prisma.market.findUniqueOrThrow({where:{code}})).id;
  await form.getByRole("button").click();await form.getByRole("status").filter({hasText:"already exists"}).waitFor();assert.equal(await form.locator('[name="name"]').inputValue(),name);
  await page.goto("http://127.0.0.1:3000/opportunities/new");
  await page.locator('[name="name"]').fill(name);await page.locator('[name="notes"]').fill("Retain these research notes after a failed save.");
  await page.locator('[name="markets"]').evaluateAll(nodes=>nodes.forEach(e=>{if(e instanceof HTMLInputElement)e.checked=false;}));
  await page.locator(`[name="markets"][value="${marketId}"]`).check();
  await page.locator('[name="markets"]:checked').evaluate(e=>{if(e instanceof HTMLInputElement)e.value="2147483647";});
  await page.getByRole("button",{name:"Create",exact:true}).click();await page.getByRole("status").filter({hasText:"no longer exists"}).waitFor();
  assert.equal(await prisma.opportunity.count({where:{name}}),0);assert.ok((await page.locator('[name="notes"]').inputValue()).includes("Retain these"));
  await page.locator('[name="markets"]:checked').evaluate((e,value)=>{if(e instanceof HTMLInputElement)e.value=value;},String(marketId));
  await page.getByRole("button",{name:"Create",exact:true}).click();await page.waitForURL(/\/opportunities\/\d+$/);
  const product=await prisma.opportunity.findFirstOrThrow({where:{name}});assert.equal(await prisma.evaluation.count({where:{opportunityId:product.id}}),1);
  await page.locator('[name="sellingPrice__value"]').fill("999999999999");await page.getByRole("button",{name:"Save inputs",exact:true}).click();
  await page.getByRole("status").filter({hasText:"supported range"}).waitFor();assert.equal(await page.locator('[name="sellingPrice__value"]').inputValue(),"999999999999");
  const value=await prisma.costInput.findFirstOrThrow({where:{evaluation:{opportunityId:product.id},key:"sellingPrice"}});assert.equal(value.value,null);
  await page.goto("http://127.0.0.1:3000/markets");
  const retryForm=page.locator("form").filter({has:page.locator('[name="code"]')});
  await retryForm.locator('[name="code"]').fill(code+"N");await retryForm.locator('[name="name"]').fill(name);
  await page.route("**/markets",route=>route.request().method()==="POST"?route.abort():route.continue());
  await retryForm.getByRole("button").click();await retryForm.getByRole("status").filter({hasText:"Could not confirm"}).waitFor();
  assert.equal(await retryForm.locator('[name="name"]').inputValue(),name);assert.equal(await prisma.market.count({where:{code:code+"N"}}),0);
  console.log("PASS: real browser preserves invalid/duplicate inputs and notes, double submit creates one market, failed product+market save rolls back, successful creation redirects, invalid money does not overwrite costs");
 }finally{
  await browser.close();await prisma.opportunity.deleteMany({where:{name}});await prisma.market.deleteMany({where:{name}});await prisma.ownerSession.deleteMany({where:{id:session.id}});
 }
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Browser form check failed");process.exitCode=1;}).finally(()=>prisma.$disconnect());
