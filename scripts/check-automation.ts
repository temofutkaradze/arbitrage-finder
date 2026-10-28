import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
import { createSchedule, setScheduleEnabled, runDiscoveryTick } from "../src/lib/automation/service";
import type { ListingInput } from "../src/lib/discovery/schema";
async function main() {
  // This check is isolated from operator jobs: it will not run if any are enabled.
  if (await prisma.discoverySchedule.count({ where: { enabled: true } })) throw new Error("Pause enabled operator schedules before running this integration check.");
  const tag = randomUUID(), ids: number[] = [], externalId = `test-${tag}`;
  const row: ListingInput = {provider:"integration-test",externalId,variantId:"",name:"TEST FIXTURE — removed",url:"https://example.com/fixture",currency:"USD",priceMinor:123,observedAt:new Date(Date.now()-1000)};
  const dependencies = { reserve: async()=>{}, fetch: async()=>[row] };
  const create = async(suffix:string) => { const job = await createSchedule({keyword:`test-${tag}-${suffix}`,intervalHours:6});ids.push(job.id);return job; };
  const due = async(id:number) => prisma.discoverySchedule.update({where:{id},data:{nextRunAt:new Date(Date.now()-1000)}});
  try {
    const job=await create("main");assert.equal(job.enabled,false);
    assert.equal(await runDiscoveryTick(dependencies),"IDLE");
    await setScheduleEnabled(job.id,true);
    const concurrent=await Promise.all([runDiscoveryTick(dependencies),runDiscoveryTick(dependencies)]);
    assert.equal(concurrent.filter(v=>v==="SUCCEEDED").length,1);
    assert.equal(await prisma.sourceListing.count({where:{externalId}}),1);
    assert.equal(await prisma.discoveryExecution.count({where:{scheduleId:job.id,state:"SUCCEEDED"}}),1);
    const success=await prisma.discoverySchedule.findUniqueOrThrow({where:{id:job.id}});
    assert.ok(success.nextRunAt.getTime()>Date.now()+5*3600000);
    await due(job.id);assert.equal(await runDiscoveryTick(dependencies),"SUCCEEDED");
    assert.equal(await prisma.listingObservation.count({where:{listing:{externalId}}}),1);
    await due(job.id);
    assert.equal(await runDiscoveryTick({reserve:async()=>{throw new Error("Wait 30 seconds between CJ operations.");},fetch:async()=>{throw new Error("must not fetch");}}),"DEFERRED");
    assert.equal((await prisma.discoverySchedule.findUniqueOrThrow({where:{id:job.id}})).failures,0);
    await due(job.id);
    assert.equal(await runDiscoveryTick({reserve:async()=>{},fetch:async()=>{throw new Error("CJ authentication failed: PRIVATE TEST VALUE");}}),"FAILED");
    assert.equal((await prisma.discoverySchedule.findUniqueOrThrow({where:{id:job.id}})).enabled,false);
    const auth=await prisma.discoveryExecution.findFirstOrThrow({where:{scheduleId:job.id,state:"FAILED"}});assert.equal(auth.message,"AUTH");
    await setScheduleEnabled(job.id,true);
    for(let i=0;i<5;i++) {await due(job.id);assert.equal(await runDiscoveryTick({reserve:async()=>{},fetch:async()=>{throw new Error("CJ request could not complete");}}),"FAILED");}
    assert.equal((await prisma.discoverySchedule.findUniqueOrThrow({where:{id:job.id}})).enabled,false);
    await setScheduleEnabled(job.id,true);
    await prisma.discoverySchedule.update({where:{id:job.id},data:{leaseToken:"expired-fixture",leaseUntil:new Date(Date.now()-1000),nextRunAt:new Date(Date.now()-1000)}});
    await prisma.discoveryExecution.create({data:{scheduleId:job.id,state:"RUNNING"}});
    assert.equal(await runDiscoveryTick(dependencies),"RECOVERED");
    assert.equal(await prisma.discoveryExecution.count({where:{scheduleId:job.id,state:"INTERRUPTED"}}),1);
    await due(job.id);
    assert.equal(await runDiscoveryTick({reserve:async()=>{},fetch:async()=>{await setScheduleEnabled(job.id,false);return[{...row,externalId:`cancel-${tag}`}];}}),"LEASE_LOST");
    assert.equal(await prisma.sourceListing.count({where:{externalId:`cancel-${tag}`}}),0);
    // Budget includes cancelled attempts, so repeated pause/resume cannot bypass it.
    await setScheduleEnabled(job.id,true);
    const used=await prisma.discoveryExecution.count({where:{startedAt:{gte:new Date(new Date().toISOString().slice(0,10))},state:{notIn:["DEFERRED"]}}});
    if(used<20)await prisma.discoveryExecution.createMany({data:Array.from({length:20-used},()=>({scheduleId:job.id,state:"CANCELLED"}))});
    assert.equal(await runDiscoveryTick({reserve:async()=>{throw new Error("Budget must stop before reserve");},fetch:async()=>[]}),"IDLE");
    await setScheduleEnabled(job.id,false);
    const jobs=[];for(let i=0;i<6;i++)jobs.push(await create(`limit${i}`));
    for(const j of jobs.slice(0,5))await setScheduleEnabled(j.id,true);
    await assert.rejects(setScheduleEnabled(jobs[5].id,true),/five/);
    console.log("PASS: paused defaults, concurrent claims, atomic import, idempotency, cooldown deferral, auth pause, bounded retries, lease recovery, pause fencing and daily/enabled limits");
  } finally {
    const executions=await prisma.discoveryExecution.findMany({where:{scheduleId:{in:ids}},select:{id:true}});
    await prisma.importRun.deleteMany({where:{source:{in:executions.map(e=>`cj-schedule:${e.id}`)}}});
    await prisma.discoverySchedule.deleteMany({where:{id:{in:ids}}});
    await prisma.sourceListing.deleteMany({where:{externalId}});
  }
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Automation check failed");process.exitCode=1;}).finally(()=>prisma.$disconnect());
