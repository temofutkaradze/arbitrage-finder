import { authenticatedFetch, cleanupTestSessions } from "./test-auth";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
import { INPUT_DEFS } from "../src/lib/profit/types";
const origin = "http://127.0.0.1:3000", tag = randomUUID();
let productId: number | undefined, marketId: number | undefined;
async function main() {
  try {
    const product = await prisma.opportunity.create({ data: { name: `REPORT FIXTURE ${tag}`, isSample: true, notes: "Private fixture note - included only after authentication." } }); productId = product.id;
    const path = `/opportunities/${product.id}/report`;
    const anonymous = await fetch(origin + path, { redirect: "manual" }); assert.equal(anonymous.status, 307); assert.equal(anonymous.headers.get("location"), "/login");
    const empty = await authenticatedFetch(origin + path); assert.equal(empty.status, 200); assert.ok(empty.headers.get("content-type")?.startsWith("text/plain")); assert.ok(empty.headers.get("cache-control")?.includes("no-store")); assert.equal(empty.headers.get("x-content-type-options"), "nosniff"); assert.match(empty.headers.get("content-disposition") ?? "", new RegExp(`attachment; filename="research-${product.id}-[0-9-]+.txt"`)); assert.ok((await empty.text()).includes("No market evaluations."));
    const market = await prisma.market.create({ data: { code: `R${tag.slice(0,8)}`, name: "REPORT FIXTURE - not a commercial choice", currency: "USD" } }); marketId = market.id;
    const evaluation = await prisma.evaluation.create({ data: { opportunityId: product.id, marketId, inputs: { create: INPUT_DEFS.filter(d => d.essential && d.key !== "cac").map(d => ({ key: d.key, value: d.key === "sellingPrice" ? 10000 : d.key === "supplierPrice" ? 2000 : d.key === "shippingToCustomer" ? 300 : 0, status: "ESTIMATED" })) } } });
    await prisma.evidence.create({ data: { opportunityId: product.id, kind: "DEMAND", provenance: "ASSUMPTION", outcome: "SUPPORTS", summary: "REPORT FIXTURE: expired assumption is not proof of demand.", url: "https://example.com/report", observedAt: new Date(0), expiresAt: new Date(0) } });
    const listing=await prisma.sourceListing.create({ data: { provider: "report-test", externalId: tag, name: "REPORT SOURCE FIXTURE", url: "https://example.com/supplier", currency: "EUR", priceMinor: 1234, observedAt: new Date(), opportunityId: product.id } });
    const variant=await prisma.supplierVariant.create({data:{listingId:listing.id,externalId:"report-variant",name:"Export stock fixture",sku:"REPORT-SKU",priceMinor:1234,origins:[{countryCode:"US",totalInventory:0,cjInventory:0,factoryInventory:0}],observedAt:new Date(0),active:false}});
    await prisma.shippingQuote.create({data:{variantId:variant.id,marketId,originCountry:"US",destinationCountry:"US",postalCode:"10001",method:"REPORT METHOD",productPriceMinor:1234,productObservedAt:new Date(0),shippingMinor:0,taxesMinor:null,clearanceMinor:null,totalPostageMinor:null,observedAt:new Date(0),expiresAt:new Date(0)}});
    await prisma.competitorObservation.create({ data: { opportunityId: product.id, marketId, merchant: "REPORT FIXTURE", url: "https://example.com/competitor", match: "UNCERTAIN", comparison: "Technical fixture, pack and variant comparison not verified.", priceMinor: 5000, shippingMinor: null, currency: "USD", taxBasis: "UNKNOWN", observedAt: new Date(), expiresAt: new Date(Date.now()+86400000) } });
    const before = { cost: await prisma.costInput.findMany({ where: { evaluationId: evaluation.id }, orderBy: { id: "asc" } }), evidence: await prisma.evidence.count({ where: { opportunityId: product.id } }), imports: await prisma.importRun.count() };
    const report = await (await authenticatedFetch(origin + path)).text();
    for (const expected of ["Contribution after ads: UNKNOWN", "USD 77.00", "EUR 12.34", "ASSUMPTION; SUPPORTS; EXPIRED", "match: UNCERTAIN", "shipping: Unknown", "Needs research", product.notes!]) assert.ok(report.includes(expected), expected);
    assert.equal((await fetch(origin+path+"?format=json",{redirect:"manual"})).status,307);
    const jsonResponse=await authenticatedFetch(origin+path+"?format=json");assert.equal(jsonResponse.status,200);assert.ok(jsonResponse.headers.get("content-type")?.startsWith("application/json"));assert.ok(jsonResponse.headers.get("content-disposition")?.endsWith('.json"'));assert.ok(jsonResponse.headers.get("cache-control")?.includes("no-store"));
    const pack=await jsonResponse.json();assert.equal(pack.schema,"arbitrage-finder.research");assert.equal(pack.version,2);assert.equal(pack.supplierVariants[0].sku,"REPORT-SKU");assert.equal(pack.shippingQuotes[0].variantId,variant.id);assert.equal(pack.shippingQuotes[0].taxesMinor,null);assert.equal(pack.shippingQuotes[0].reviewState,"inactive_variant");assert.equal(pack.evaluations[0].calculation.complete,false);assert.ok(pack.product.notes.includes("Private fixture note"));assert.equal(pack.competitorObservations[0].shippingMinor,null);
    assert.equal((await authenticatedFetch(origin+path+"?format=html")).status,400);
    await prisma.costInput.create({ data: { evaluationId: evaluation.id, key: "cac", value: 1000, status: "ESTIMATED" } });
    const complete = await (await authenticatedFetch(origin + path)).text(); assert.ok(complete.includes("Contribution after ads / order: USD 67.00"));
    await prisma.costInput.delete({ where: { evaluationId_key: { evaluationId: evaluation.id, key: "cac" } } });
    assert.deepEqual(await prisma.costInput.findMany({ where: { evaluationId: evaluation.id }, orderBy: { id: "asc" } }), before.cost);
    assert.equal(await prisma.evidence.count({ where: { opportunityId: product.id } }), before.evidence); assert.equal(await prisma.importRun.count(), before.imports);
    const page = await (await authenticatedFetch(origin + `/opportunities/${product.id}`)).text(); assert.ok(page.includes(`href="${path}"`));
    for (const invalid of ["0", "abc", "999999999999999999999", "2147483647"]) assert.equal((await authenticatedFetch(origin + `/opportunities/${invalid}/report`)).status, 404);
    // Bounded queries must refuse a partial document.
    await prisma.sourceListing.createMany({ data: Array.from({ length: 500 }, (_, i) => ({ provider: "report-test", externalId: `${tag}-${i}`, name: "REPORT LIMIT FIXTURE", url: "https://example.com", currency: "USD", priceMinor: null, observedAt: new Date(), opportunityId: product.id })) });
    assert.equal((await authenticatedFetch(origin+path+"?format=json")).status,413);
    const limited = await authenticatedFetch(origin + path); assert.equal(limited.status, 413); assert.ok((await limited.text()).includes("No partial report"));
    console.log("PASS: private report download, cache/MIME/filename safety, unknown CAC and full calculation, independent currencies, evidence expiry, unknown competitor shipping, no side effects, invalid IDs and fail-closed export limits");
  } finally {
    await prisma.sourceListing.deleteMany({ where: { provider: "report-test", OR: [{ externalId: tag }, { externalId: { startsWith: `${tag}-` } }] } });
    if (productId) await prisma.opportunity.deleteMany({ where: { id: productId } });
    if (marketId) await prisma.market.deleteMany({ where: { id: marketId } });
  }
}
main().catch(e => { console.error(e instanceof Error ? e.message : "Report check failed"); process.exitCode = 1; }).finally(async () => { await cleanupTestSessions(); await prisma.$disconnect(); });
