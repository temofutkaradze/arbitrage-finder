import "./test-auth";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { prisma } from "../src/lib/db/prisma";
import { newSession, configuredAuth, SESSION_COOKIE } from "../src/lib/auth/core";
async function main() {
 const url="http://127.0.0.1:3000/payments";
 assert.equal((await fetch(url,{redirect:"manual"})).status,307);
 const session=newSession();
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:["--no-sandbox"]});
 try {
 await prisma.ownerSession.create({data:{id:session.id,passwordVersion:configuredAuth().version,expiresAt:session.expiresAt}});
  const context=await browser.newContext();context.setDefaultTimeout(20000);context.setDefaultNavigationTimeout(20000);
  await context.addCookies([{name:SESSION_COOKIE,value:session.token,url}]);
  const page=await context.newPage();let posts=0;page.on("request",r=>{if(r.method()==="POST")posts++;});
  await page.goto(url);
  await page.getByLabel("ქართული ბარათების ბრუნვა",{exact:true}).fill("1000");
  await page.getByLabel("უცხოური ბარათების ბრუნვა",{exact:true}).fill("2000");
  await page.getByLabel("მათ შორის Apple Pay ბრუნვა").fill("500");
  await page.getByText("მოდელირებული თვიური საკომისიო:").filter({hasText:"72.00 GEL"}).waitFor();
  await page.getByText("ამ თვის უცხოური ბრუნვის 10% რეზერვი:").filter({hasText:"200.00 GEL"}).waitFor();
  await page.getByLabel("მათ შორის Apple Pay ბრუნვა").fill("4000");
  await page.getByRole("alert").filter({hasText:"Apple Pay ბრუნვა"}).waitFor();
  assert.equal(await page.getByText("მოდელირებული თვიური საკომისიო:").count(),0);
  assert.equal(posts,0);
  console.log("PASS: owner-protected payment scenario, mixed-card fees, separate reserve, invalid input removes result and no writes");
 } finally {await browser.close();await prisma.ownerSession.deleteMany({where:{id:session.id}});}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Payment browser check failed");process.exitCode=1;}).finally(()=>prisma.$disconnect());
