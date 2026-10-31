import "./test-auth";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {prisma} from "../src/lib/db/prisma";
import {enqueueResearch,claimResearch,finishResearch,stopResearch} from "../src/lib/automation/jobs";
async function main(){
 // Run only after the approved migration, with no unrelated worker running.
 process.env.RESEARCH_JOBS_ENABLED="true";
 assert.equal(await prisma.researchJob.count({where:{state:{in:["QUEUED","RUNNING"]}}}),0,"Stop existing jobs before this integration check");
 const product=await prisma.opportunity.create({data:{name:"Durable worker fixture"}});
 const ids=[randomUUID(),randomUUID()];let listingId:number|undefined;
 try{
  const listing=await prisma.sourceListing.create({data:{provider:"cj",importedVia:"CJ_API",externalId:randomUUID(),name:"Fixture",url:"https://example.com/fixture",currency:"USD",observedAt:new Date(),opportunityId:product.id}});listingId=listing.id;
  const input={id:ids[0],ids:[listing.id],confirmed:true};
  const submissions=await Promise.all([enqueueResearch(input),enqueueResearch(input)]);
  assert.deepEqual(submissions,[ids[0],ids[0]]);
  await assert.rejects(enqueueResearch({...input,id:ids[1]}));
  const claims=await Promise.all([claimResearch(),claimResearch()]);
  const job=claims.find(Boolean)!;assert.equal(claims.filter(Boolean).length,1);
  assert.equal(await finishResearch(job.id,randomUUID(),{ok:true,message:"wrong worker"}),false);
  await stopResearch(job.id);
  assert.equal(await finishResearch(job.id,job.leaseToken!,{ok:true,message:"mock result"}),true);
  assert.equal((await prisma.researchJob.findUniqueOrThrow({where:{id:job.id}})).state,"CANCELLED");
  await enqueueResearch({...input,id:ids[1]});const interrupted=(await claimResearch())!;
  await prisma.researchJob.update({where:{id:interrupted.id},data:{leaseUntil:new Date(0)}});
  assert.equal(await claimResearch(),null);
  assert.equal((await prisma.researchJob.findUniqueOrThrow({where:{id:interrupted.id}})).state,"INTERRUPTED");
  assert.equal(await finishResearch(interrupted.id,interrupted.leaseToken!,{ok:true,message:"late"}),false);
  assert.equal(await prisma.evaluation.count({where:{opportunityId:product.id}}),0);
  console.log("PASS: idempotent enqueue, one active job, exclusive claim, fenced results, cancellation, no replay after expired lease, no financial changes or provider calls");
 }finally{
  await prisma.researchJob.deleteMany({where:{id:{in:ids}}});
  if(listingId)await prisma.sourceListing.deleteMany({where:{id:listingId}});
  await prisma.opportunity.deleteMany({where:{id:product.id}});
 }
}
main().catch(()=>{console.error("Background job integration check failed. Inspect the isolated test database and migration readiness.");process.exitCode=1;}).finally(()=>prisma.$disconnect());
