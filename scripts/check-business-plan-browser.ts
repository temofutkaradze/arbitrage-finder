import "./test-auth";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { prisma } from "../src/lib/db/prisma";
import { newSession, configuredAuth, SESSION_COOKIE } from "../src/lib/auth/core";
import { INPUT_DEFS } from "../src/lib/profit/types";

async function main() {
  const tag = crypto.randomUUID();
  const market = await prisma.market.create({data:{code:`BP-${tag}`,name:"Business plan fixture",currency:"USD",pricesIncludeTax:false,countryCode:"US"}});
  const session = newSession();
  let productId: number | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    const product = await prisma.opportunity.create({data:{name:`Business fixture ${tag}`}});
    productId = product.id;
    const evaluation = await prisma.evaluation.create({data:{opportunityId:product.id,marketId:market.id,inputs:{create:INPUT_DEFS.map(d=>({key:d.key,value:d.key==="sellingPrice"?10000:d.key==="supplierPrice"?3000:d.key==="shippingToCustomer"?1000:d.key==="cac"?2000:0,status:"ESTIMATED"}))}}});
    const before = JSON.stringify(await prisma.costInput.findMany({where:{evaluationId:evaluation.id},orderBy:{key:"asc"}}));
    const history = await prisma.financialChange.count({where:{evaluationId:evaluation.id}});
    await prisma.ownerSession.create({data:{id:session.id,passwordVersion:configuredAuth().version,expiresAt:session.expiresAt}});
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:["--no-sandbox"]});
    const context = await browser.newContext();
    context.setDefaultTimeout(20000);
    await context.addCookies([{name:SESSION_COOKIE,value:session.token,url:"http://127.0.0.1:3000"}]);
    const page = await context.newPage();
    let posts = 0;
    page.on("request",r=>{if(r.method()==="POST")posts++;});
    await page.goto(`http://127.0.0.1:3000/opportunities/${product.id}`);
    const panel = page.locator("details").filter({has:page.getByText("ბიზნესგეგმა — მიზნობრივი მოგება, სტრესი და კაპიტალი",{exact:true})});
    await panel.locator("summary").click();
    await panel.getByText("მიზნობრივი CAC-ისთვის შეავსე",{exact:false}).waitFor();
    await panel.getByLabel("თვიური ფიქსირებული ბიზნესხარჯი").fill("200");
    await panel.getByLabel("თვიური შეკვეთები").fill("100");
    await panel.getByLabel("მიზნობრივი საოპერაციო მარჟა").fill("20");
    await panel.getByLabel("გაურკვევლობის ბუფერი").fill("3,00");
    await panel.getByLabel("ჩარიცხვის დაგვიანება").fill("7");
    await panel.getByLabel("დღიური შეკვეთები").fill("4");
    await panel.getByLabel("დამატებითი ფულადი რეზერვი").fill("500");
    await panel.locator(".cards > div").filter({hasText:"მიზნისთვის დასაშვები CAC"}).getByText("$35.00",{exact:true}).waitFor();
    await panel.getByText("ლიკვიდობის ილუსტრაცია:",{exact:false}).filter({hasText:"$2,380.00"}).waitFor();
    await panel.getByLabel("თვიური შეკვეთები").fill("0");
    await panel.getByText("შეამოწმე მნიშვნელობები:",{exact:false}).waitFor();
    assert.equal(await panel.locator(".cards").count(),0);
    await page.reload();
    assert.equal(await page.getByLabel("თვიური ფიქსირებული ბიზნესხარჯი").inputValue(),"");
    assert.equal(posts,0);
    assert.equal(JSON.stringify(await prisma.costInput.findMany({where:{evaluationId:evaluation.id},orderBy:{key:"asc"}})),before);
    assert.equal(await prisma.financialChange.count({where:{evaluationId:evaluation.id}}),history);
    console.log("PASS: business planning computes target CAC and cash, validates counts, resets on reload, makes no POST or financial writes");
  } finally {
    await browser?.close();
    if(productId) await prisma.opportunity.deleteMany({where:{id:productId}});
    await prisma.market.deleteMany({where:{id:market.id}});
    await prisma.ownerSession.deleteMany({where:{id:session.id}});
  }
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Business plan browser check failed");process.exitCode=1;}).finally(()=>prisma.$disconnect());
