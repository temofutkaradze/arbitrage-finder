import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
import { acceptListingLink, matchingProposals, saveIdentity, undoListingLink } from "../src/lib/matching/service";
import { importListings, promoteListing } from "../src/lib/discovery/import";
const tag = randomUUID(), provider = `match-${tag.slice(0,8)}`;
const listingIds: number[] = [], opportunities: number[] = [];
let marketId: number | undefined;
// Unique synthetic checksum-valid identifier, removed with all test fixtures.
const gtinBody = "2" + (BigInt("0x" + tag.replaceAll("-", "")) % BigInt("1000000000000")).toString().padStart(12, "0");
const gtinCheck = (10 - [...gtinBody].reduce((sum, digit, i) => sum + Number(digit) * (i % 2 === 0 ? 3 : 1), 0) % 10) % 10;
const identity = { gtin: gtinBody + gtinCheck, brand: `TEST-${tag}`, mpn: "AB-12", packUnits: "1", variantKey: "BLUE / 10 CM", sourceUrl: "https://example.com/fixture", observedAt: new Date(Date.now()-10000).toISOString(), note: "TEST FIXTURE ONLY: identifiers supplied for local technical validation." };
async function listing(suffix: string, priceMinor = 100, currency = "USD") {
  const row = await prisma.sourceListing.create({ data: { provider, externalId: `${tag}-${suffix}`, name: `TEST MATCH ${suffix}`, url: "https://example.com/fixture", currency, priceMinor, observedAt: new Date(Date.now()-5000) } });
  listingIds.push(row.id); return row;
}
async function main() {
  try {
    const source = await listing("source", 800, "EUR"), target = await listing("target", 100, "USD");
    const opportunityId = await promoteListing(target.id); opportunities.push(opportunityId);
    const market = await prisma.market.create({ data: { code: `M${tag.slice(0,8)}`, name: "TEST FIXTURE - not a selected market", currency: "USD" } }); marketId = market.id;
    const evaluation = await prisma.evaluation.create({ data: { opportunityId, marketId, inputs: { create: { key: "supplierPrice", value: 999, status: "VERIFIED", note: "Preserve independently entered economics" } } } });
    await saveIdentity(source.id, 0, identity);
    await assert.rejects(saveIdentity(source.id, 0, identity), /changed/);
    await assert.rejects(saveIdentity(target.id, 0, { ...identity, observedAt: new Date(Date.now()+86400000).toISOString() }), /future/);
    await saveIdentity(target.id, 0, { ...identity, packUnits: "" });
    let state = await matchingProposals(source.id); assert.equal(state.groups.length, 1); assert.equal(state.groups[0].ready, false);
    const args = { listingId: source.id, targetListingId: target.id, expectedOpportunityId: opportunityId, sourceRevision: 1, targetRevision: 1, confirmed: true, note: "TEST FIXTURE: exact variant and pack checked in both test sources." };
    await assert.rejects(acceptListingLink(args), /incomplete/);
    await saveIdentity(target.id, 1, identity);
    await assert.rejects(acceptListingLink(args), /changed/);
    await assert.rejects(acceptListingLink({ ...args, targetRevision: 2, confirmed: false }), /Confirm/);
    await saveIdentity(target.id, 2, { ...identity, packUnits: "2" });
    state = await matchingProposals(source.id); assert.ok(state.groups[0].reasons.includes("Conflicting packUnits"));
    await saveIdentity(target.id, 3, identity);
    const duplicate = await listing("duplicate"); const duplicateOpportunity = await promoteListing(duplicate.id); opportunities.push(duplicateOpportunity);
    await saveIdentity(duplicate.id, 0, identity);
    state = await matchingProposals(source.id); assert.equal(state.ambiguous, true); assert.ok(state.groups.every(g => !g.ready));
    await assert.rejects(acceptListingLink({ ...args, targetRevision: 4 }), /ambiguous/);
    await prisma.opportunity.delete({ where: { id: duplicateOpportunity } }); opportunities.splice(opportunities.indexOf(duplicateOpportunity), 1);
    // A linked sibling with unknown or contradictory identity prevents attachment.
    const sibling = await listing("sibling"); await prisma.sourceListing.update({ where: { id: sibling.id }, data: { opportunityId } });
    state = await matchingProposals(source.id); assert.ok(state.groups[0].reasons.includes("A linked listing has no recorded identity"));
    await prisma.sourceListing.update({ where: { id: sibling.id }, data: { opportunityId: null } });
    await assert.rejects(acceptListingLink({ ...args, targetRevision: 4, expectedOpportunityId: duplicateOpportunity }), /record changed/);
    const successes = await Promise.allSettled([acceptListingLink({ ...args, targetRevision: 4 }), acceptListingLink({ ...args, targetRevision: 4 })]);
    assert.equal(successes.filter(s => s.status === "fulfilled").length, 1);
    assert.equal(await prisma.listingLinkDecision.count({ where: { listingId: source.id } }), 1);
    assert.equal((await prisma.sourceListing.findUniqueOrThrow({ where: { id: source.id } })).opportunityId, opportunityId);
    assert.equal((await prisma.sourceListing.findUniqueOrThrow({ where: { id: source.id } })).currency, "EUR");
    assert.equal((await prisma.sourceListing.findUniqueOrThrow({ where: { id: target.id } })).priceMinor, 100);
    const cost = await prisma.costInput.findUniqueOrThrow({ where: { evaluationId_key: { evaluationId: evaluation.id, key: "supplierPrice" } } }); assert.equal(cost.value, 999); assert.equal(cost.status, "VERIFIED");
    assert.equal(await prisma.evidence.count({ where: { opportunityId } }), 0);
    await assert.rejects(saveIdentity(source.id, 1, { ...identity, variantKey: "RED" }), /conflicts/);
    await importListings([{ provider, externalId: source.externalId, variantId: "", name: "Refreshed test fixture", url: source.url, currency: "EUR", priceMinor: 850, observedAt: new Date() }], `json:${provider}`);
    assert.equal((await prisma.listingIdentity.findUniqueOrThrow({ where: { listingId: source.id } })).revision, 1);
    await assert.rejects(undoListingLink(source.id, opportunityId, "too short", true), /Confirm/);
    await undoListingLink(source.id, opportunityId, "TEST FIXTURE: undo the reviewed linkage to verify correction history.", true);
    assert.equal((await prisma.sourceListing.findUniqueOrThrow({ where: { id: source.id } })).opportunityId, null);
    assert.equal(await prisma.listingLinkDecision.count({ where: { listingId: source.id } }), 2);
    assert.equal(await prisma.evaluation.count({ where: { opportunityId } }), 1);
    await assert.rejects(undoListingLink(source.id, opportunityId, "TEST FIXTURE: repeated undo must not remove another link.", true), /current/);
    assert.equal(await prisma.identityRevision.count({ where: { listingId: target.id } }), 4);
    // Boundaries fail closed, rather than silently hiding ambiguous matches.
    await prisma.sourceListing.createMany({ data: Array.from({ length: 201 }, (_, i) => ({ provider, externalId: `${tag}-bound-${i}`, name: "TEST BOUND FIXTURE", url: "https://example.com/fixture", currency: "USD", observedAt: new Date(), opportunityId })) });
    state = await matchingProposals(source.id); assert.equal(state.limited, true); assert.ok(state.groups.every(g => !g.ready));
    console.log("PASS: identity validation/revisions, missing/contradictory/ambiguous matches, stale and concurrent acceptance, import preservation, unchanged costs/evidence, audited undo and bounded review");
  } finally {
    await prisma.listingLinkDecision.deleteMany({ where: { listingId: { in: listingIds } } });
    await prisma.identityRevision.deleteMany({ where: { listingId: { in: listingIds } } });
    await prisma.sourceListing.deleteMany({ where: { provider } });
    await prisma.opportunity.deleteMany({ where: { id: { in: opportunities } } });
    if (marketId) await prisma.market.delete({ where: { id: marketId } });
    await prisma.importRun.deleteMany({ where: { source: `json:${provider}` } });
  }
}
main().catch(e => { console.error(e instanceof Error ? e.message : "Matching check failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
