import {AiProviderError} from "../src/lib/ai/errors";
import "./test-auth";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db/prisma";
import { researchPacket } from "../src/lib/ai/packet";
import { runResearch } from "../src/lib/ai/service";
import { generateReport } from "../src/lib/ai/provider";
import { authenticatedFetch, cleanupTestSessions } from "./test-auth";
async function main(){
 const budget=await prisma.aiResearchBudget.findUnique({where:{id:"owner"}});
 const p=await prisma.opportunity.create({data:{name:`AI fixture ${crypto.randomUUID()}`,notes:"PRIVATE GENERAL NOTE NEVER SEND"}});
 let calls=0;
 const fake:typeof generateReport=async()=>{calls++;return {findings:[{kind:"unknown",text:"Missing demand evidence",sourceIds:[`product:${p.id}`]}]};};
 try{
  const packet=await researchPacket(p.id);assert.ok(packet);assert.ok(!JSON.stringify(packet.snapshot).includes("PRIVATE GENERAL NOTE"));
  process.env.AI_RESEARCH_ENABLED="false";
  process.env.AI_PROVIDER="gemini";
  assert.ok((await runResearch(p.id,packet.hash,fake)).includes("გამორთულია"));assert.equal(calls,0);
  assert.equal((await fetch(`http://127.0.0.1:3000/opportunities/${p.id}/ai`,{redirect:"manual"})).status,307);
  const page=await authenticatedFetch(`http://127.0.0.1:3000/opportunities/${p.id}/ai`);assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes("AI ჯერ გამორთულია"));assert.ok(html.includes("AI კავშირის შემოწმება"));assert.ok(html.includes("AI_RESEARCH_ENABLED"));assert.ok(!html.includes("mock-only-never-send"));
  process.env.AI_RESEARCH_ENABLED="true";process.env.GEMINI_API_KEY="mock-only-never-send";process.env.AI_RESEARCH_MODEL="mock-model";
  await prisma.aiResearchBudget.deleteMany({where:{id:"owner"}});
  assert.ok((await runResearch(p.id,"wrong hash",fake)).includes("შეიცვალა"));assert.equal(calls,0);
  const messages=await Promise.all([runResearch(p.id,packet.hash,fake),runResearch(p.id,packet.hash,fake)]);
  assert.equal(calls,1);assert.ok(messages.some(m=>m.includes("ლიმიტი")));
  assert.equal(await prisma.aiResearchRun.count({where:{opportunityId:p.id,state:"SUCCEEDED",model:"gemini:mock-model"}}),1);
  const savedPage=await authenticatedFetch(`http://127.0.0.1:3000/opportunities/${p.id}/ai`);
  assert.ok((await savedPage.text()).includes("Missing demand evidence"));
  await prisma.aiResearchBudget.update({where:{id:"owner"},data:{lastStartedAt:new Date(Date.now()-100000)}});
  const failing:typeof generateReport=async()=>{throw new AiProviderError("model");};
  const failed=await runResearch(p.id,packet.hash,failing);assert.ok(!failed.includes("sensitive"));assert.ok(failed.includes("404"));
  assert.equal(await prisma.aiResearchRun.count({where:{opportunityId:p.id,state:"FAILED"}}),1);
  const failedRun=await prisma.aiResearchRun.findFirstOrThrow({where:{opportunityId:p.id,state:"FAILED"}});assert.deepEqual(failedRun.report,{failureCode:"model"});
  const errorPage=await authenticatedFetch(`http://127.0.0.1:3000/opportunities/${p.id}/ai`);assert.ok((await errorPage.text()).includes("HTTP 404"));
  await prisma.aiResearchBudget.update({where:{id:"owner"},data:{attempts:10,lastStartedAt:new Date(Date.now()-100000)}});
  assert.ok((await runResearch(p.id,packet.hash,fake)).includes("ლიმიტი"));assert.equal(calls,1);
  assert.equal(await prisma.financialChange.count({where:{evaluation:{opportunityId:p.id}}}),0);
  await prisma.opportunity.delete({where:{id:p.id}});
  assert.equal((await prisma.aiResearchBudget.findUniqueOrThrow({where:{id:"owner"}})).attempts,10);
  console.log("PASS: disabled AI sends nothing, owner-only preview, private general notes excluded, stale preview rejected, concurrent requests call mocked provider once, report saved and budget survives deletion");
 }finally{
  await prisma.opportunity.deleteMany({where:{id:p.id}});
  await prisma.aiResearchBudget.deleteMany({where:{id:"owner"}});
  if(budget)await prisma.aiResearchBudget.create({data:budget});
  await cleanupTestSessions();
 }
}
main().catch(e=>{console.error(e instanceof Error?e.message:"AI check failed");process.exitCode=1;}).finally(()=>prisma.$disconnect());
