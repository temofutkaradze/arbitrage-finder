import "./test-auth";
import assert from "node:assert/strict";
import {chromium} from "playwright";
import {prisma} from "../src/lib/db/prisma";
import {newSession,configuredAuth,SESSION_COOKIE} from "../src/lib/auth/core";
async function main(){
 const session=newSession(),tag=crypto.randomUUID();let productId:number|undefined,listingId:number|undefined;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:["--no-sandbox"]});
 try{
  await prisma.ownerSession.create({data:{id:session.id,passwordVersion:configuredAuth().version,expiresAt:session.expiresAt}});
  const p=await prisma.opportunity.create({data:{name:`Batch test ${tag}`,isSample:true}});productId=p.id;
  const l=await prisma.sourceListing.create({data:{provider:"cj",importedVia:"CJ_API",externalId:tag,name:`Batch test ${tag}`,url:"https://example.com/fixture",currency:"USD",observedAt:new Date(),opportunityId:p.id}});listingId=l.id;
  const context=await browser.newContext();await context.addCookies([{name:SESSION_COOKIE,value:session.token,url:"http://127.0.0.1:3000"}]);const page=await context.newPage();
  let posts=0;const count=await prisma.importRun.count();
  await page.route('**/automation',async route=>{if(route.request().method()!=="POST")return route.continue();posts++;if(posts===1)return route.continue();await new Promise(r=>setTimeout(r,700));await route.abort();});
  await page.goto('http://127.0.0.1:3000/automation');const batch=page.locator('section').filter({has:page.locator('#batch-title')});
  await batch.locator('select').first().selectOption(String(l.id));await batch.locator('input[type=checkbox]').last().check();
  await batch.getByRole('button',{name:'გაუშვი CJ ეტაპი',exact:true}).evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click();});
  await page.waitForFunction(()=>document.querySelector('[aria-label="ჯგუფური კვლევის ეტაპები"]')?.textContent?.includes('ვარიანტები'));
  await batch.getByRole('button',{name:'Stop',exact:true}).click();
  await batch.getByRole('button',{name:'გაუშვი CJ ეტაპი',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector<HTMLButtonElement>('#batch-title')?.closest('section')?.querySelector('button')?.disabled);
  assert.equal(posts,2);assert.equal(await prisma.importRun.count(),count);assert.equal(await prisma.supplierVariant.count({where:{listingId:l.id}}),0);
  console.log('PASS: real preflight, duplicate-launch guard, stop with intercepted supplier request, no provider calls or follow-ups');
 }finally{await browser.close();if(listingId)await prisma.sourceListing.deleteMany({where:{id:listingId}});if(productId)await prisma.opportunity.deleteMany({where:{id:productId}});await prisma.ownerSession.deleteMany({where:{id:session.id}});}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Batch check failed');process.exitCode=1;}).finally(()=>prisma.$disconnect());
