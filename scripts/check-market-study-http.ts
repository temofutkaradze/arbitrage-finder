import { authenticatedFetch, cleanupTestSessions } from "./test-auth";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db/prisma";
async function main(){
 const url="http://127.0.0.1:3000/market-study";
 const anonymous=await fetch(url,{redirect:"manual"});assert.equal(anonymous.status,307);assert.equal(anonymous.headers.get("location"),"/login");
 const imports=await prisma.importRun.count(),markets=await prisma.market.count();
 const response=await authenticatedFetch(url);assert.equal(response.status,200);const html=await response.text();
 for(const value of ["2026-10-29","37.20","35.00","Fabricon","NEAR_MATCH_UNCONFIRMED","84.41","29.40","1876836104574853122","1496403300495527936","https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries","https://matsne.gov.ge/en/document/view/1043717"])assert.ok(html.includes(value),value);
 assert.equal(await prisma.importRun.count(),imports);assert.equal(await prisma.market.count(),markets);
 console.log("PASS: protected GE/US study rendering, exact candidate/route findings, official sources and no new provider attempts or market selection on viewing");
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Study check failed");process.exitCode=1;}).finally(async()=>{await cleanupTestSessions();await prisma.$disconnect();});
