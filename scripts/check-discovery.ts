import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
import { importListings, promoteListing } from "../src/lib/discovery/import";
import { parseImport } from "../src/lib/discovery/schema";

// Temporary, uniquely identified fixtures. No reset, truncation or real imports.
async function main() {
  const source=`integration-${randomUUID()}`;
  const externalId=randomUUID();
  let opportunityId:number|undefined;
  const observedAt=new Date(Date.now()-60000).toISOString();
  const input={provider:"integration-test",externalId,name:"TEST FIXTURE — removed after verification",url:"https://example.com/test-fixture",currency:"USD",priceMinor:1234,observedAt};
  const parse=(row:typeof input)=>parseImport(JSON.stringify([row]));
  try {
    assert.equal((await importListings(parse(input),source)).created,1);
    assert.equal((await importListings(parse(input),source)).unchanged,1);
    let listing=await prisma.sourceListing.findUniqueOrThrow({where:{provider_externalId_variantId:{provider:input.provider,externalId,variantId:""}},include:{observations:true}});
    assert.equal(listing.observations.length,1);
    const changed={...input,priceMinor:1456,observedAt:new Date(Date.now()-30000).toISOString()};
    assert.equal((await importListings(parse(changed),source)).updated,1);
    listing=await prisma.sourceListing.findUniqueOrThrow({where:{id:listing.id},include:{observations:true}});
    assert.equal(listing.observations.length,2);
    await assert.rejects(importListings(parse(input),source),/older/);
    await assert.rejects(importListings(parse({...changed,priceMinor:999}),source),/Conflicting/);
    const atomicId=randomUUID();
    await assert.rejects(importListings(parseImport(JSON.stringify([{...input,externalId:atomicId},input])),source),/older/);
    assert.equal(await prisma.sourceListing.count({where:{provider:input.provider,externalId:atomicId}}),0);
    const [a,b]=await Promise.all([promoteListing(listing.id),promoteListing(listing.id)]);
    opportunityId=a;assert.equal(a,b);
    assert.equal(await prisma.evaluation.count({where:{opportunityId:a}}),0);
    assert.equal((await prisma.sourceListing.findUniqueOrThrow({where:{id:listing.id}})).priceMinor,1456);
    // Failed imports must not persist audit rows or partial catalogue changes.
    assert.equal(await prisma.importRun.count({where:{source}}),3);
    console.log("PASS: database import, idempotency, history, stale/conflict rejection, concurrent promotion and no fabricated evaluations");
  } finally {
    if(opportunityId) await prisma.opportunity.delete({where:{id:opportunityId}});
    await prisma.sourceListing.deleteMany({where:{provider:input.provider,externalId}});
    await prisma.importRun.deleteMany({where:{source}});
  }
}
main().catch(()=>{console.error("Discovery integration check failed; inspect the local database and test assertions.");process.exitCode=1;}).finally(()=>prisma.$disconnect());
