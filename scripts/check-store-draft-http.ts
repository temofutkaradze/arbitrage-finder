import { authenticatedFetch, cleanupTestSessions } from "./test-auth";
import { prisma } from "../src/lib/db/prisma";
import assert from "node:assert/strict";
const origin = "http://127.0.0.1:3000";
async function main() {
  const product = await prisma.opportunity.create({ data: { name: "STORE DRAFT TEST FIXTURE", notes: "Private supplier cost note", isSample: true } });
  const path = `/opportunities/${product.id}/prepare`, endpoint = origin + path + "/download";
  const values = { expectedUpdatedAt: product.updatedAt.toISOString(), title: "Reviewed draft title", description: '<script>alert("test")</script> A factual description for testing only.', sources: "https://example.com/source", reviewed: "on" };
  const post = (data: Record<string,string>, requestOrigin = origin, authenticated = true) => (authenticated ? authenticatedFetch : fetch)(endpoint, { method: "POST", headers: { Origin: requestOrigin }, body: new URLSearchParams(data), redirect: "manual" });
  try {
    assert.equal((await fetch(origin + path, { redirect: "manual" })).status, 307);
    assert.equal((await post(values, origin, false)).status, 307);
    assert.equal((await post(values, "https://wrong.example")).status, 403);
    const html = await (await authenticatedFetch(origin + path)).text(); assert.ok(html.includes("Download draft review file")); assert.ok(!html.includes(product.notes!));
    assert.equal((await post({ ...values, reviewed: "" })).status, 400);
    assert.equal((await post({ ...values, sources: "javascript:alert(1)" })).status, 400);
    assert.equal((await post({ ...values, expectedUpdatedAt: "stale" })).status, 409);
    const response = await post(values); assert.equal(response.status, 200); assert.ok(response.headers.get("cache-control")?.includes("no-store")); assert.ok(response.headers.get("content-disposition")?.includes(`store-draft-${product.id}.json`));
    const body = await response.text(), json = JSON.parse(body); assert.equal(json.shopifyProductInput.status, "DRAFT"); assert.equal(json.state, "REVIEW_REQUIRED"); assert.ok(!body.includes("Private supplier cost")); assert.ok(!json.shopifyProductInput.descriptionHtml.includes("<script>"));
    assert.ok(!("price" in json.shopifyProductInput)); assert.ok(!("images" in json.shopifyProductInput));
    assert.equal((await post({ ...values, description: "x".repeat(33000) })).status, 413);
    assert.deepEqual(await prisma.opportunity.findUnique({ where: { id: product.id } }), product);
    console.log("PASS: private/origin-checked store draft form and download, review/source validation, escaped text, stale-product rejection, body bound, no private notes, fixed DRAFT status and unchanged research");
  } finally { await prisma.opportunity.delete({ where: { id: product.id } }); }
}
main().catch(e => { console.error(e instanceof Error ? e.message : "Store draft check failed"); process.exitCode = 1; }).finally(async () => { await cleanupTestSessions(); await prisma.$disconnect(); });
