import "./test-auth";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { prisma } from "../src/lib/db/prisma";
import { newSession,configuredAuth,SESSION_COOKIE } from "../src/lib/auth/core";
async function main(){
 const tag=crypto.randomUUID(),session=newSession();
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:["--no-sandbox"]});
 let productId:number|undefined,listingId:number|undefined;
 try{
  await prisma.ownerSession.create({data:{id:session.id,passwordVersion:configuredAuth().version,expiresAt:session.expiresAt}});
  const p=await prisma.opportunity.create({data:{name:`Refresh browser ${tag}`}});productId=p.id;
  const l=await prisma.sourceListing.create({data:{provider:"cj",externalId:tag,name:`Refresh browser ${tag}`,url:"https://example.com/fixture",currency:"USD",priceMinor:100,observedAt:new Date(),importedVia:"CJ_API",opportunityId:p.id}});listingId=l.id;
  const context=await browser.newContext();context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(15000);
  await context.addCookies([{name:SESSION_COOKIE,value:session.token,url:"http://127.0.0.1:3000"}]);const page=await context.newPage();
  let posts=0;
  await page.route("**/discovery/*",async route=>{if(route.request().method()==="POST"){posts++;await new Promise(r=>setTimeout(r,1000));await route.abort();}else await route.continue();});
  const before=await prisma.importRun.count();await page.goto(`http://127.0.0.1:3000/discovery/${l.id}`);
  const button=page.getByRole("button",{name:"განაახლე პროდუქტის მონაცემები",exact:true});
  await button.evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click();});
  await page.getByRole("button",{name:"Stop",exact:true}).click();
  await page.getByText("შეჩერებულია: უკვე გაგზავნილი მოთხოვნა").waitFor();
  assert.equal(posts,1);assert.equal(await prisma.importRun.count(),before);
  assert.equal(await prisma.supplierVariant.count({where:{listingId:l.id}}),0);
  console.log("PASS: real browser prevents double launch, permits stop during a failed/in-flight action and sends no follow-up/provider requests");
 }finally{await browser.close();if(listingId)await prisma.sourceListing.deleteMany({where:{id:listingId}});if(productId)await prisma.opportunity.deleteMany({where:{id:productId}});await prisma.ownerSession.deleteMany({where:{id:session.id}});}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Refresh browser check failed");process.exitCode=1;}).finally(()=>prisma.$disconnect());
