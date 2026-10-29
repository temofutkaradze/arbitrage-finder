import { authenticatedFetch, cleanupTestSessions } from "./test-auth";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
import { promoteListing } from "../src/lib/discovery/import";
const origin = "http://127.0.0.1:3000", tag = randomUUID(), provider = `match-http-${tag.slice(0,8)}`;
const listingIds: number[] = []; let opportunityId: number | undefined;
const decode = (s: string) => s.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&#x27;", "'");
const forms = (s: string) => [...s.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(m => m[1]);
async function page(path: string) { const response = await authenticatedFetch(origin + path); assert.equal(response.status, 200); return response.text(); }
async function submit(path: string, form: string, values: Record<string, string>, authenticated = true, requestOrigin = origin) {
  const data = new FormData();
  for (const m of form.matchAll(/<input\b[^>]*>/g)) {
    if (!m[0].includes('type="hidden"')) continue;
    const name = m[0].match(/name="([^"]*)"/)?.[1], value = m[0].match(/value="([^"]*)"/)?.[1] ?? "";
    if (name) data.append(decode(name), decode(value));
  }
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return (authenticated ? authenticatedFetch : fetch)(origin + path, { method: "POST", headers: { Origin: requestOrigin }, body: data, redirect: "manual" });
}
async function main() {
  try {
    const anonymous = await fetch(origin + "/matching", { redirect: "manual" }); assert.equal(anonymous.status, 307); assert.equal(anonymous.headers.get("location"), "/login");
    for (const suffix of ["source", "target"]) {
      const row = await prisma.sourceListing.create({ data: { provider, externalId: `${tag}-${suffix}`, name: `HTTP MATCH FIXTURE ${suffix}`, url: "https://example.com/fixture", currency: "USD", priceMinor: 123, observedAt: new Date() } }); listingIds.push(row.id);
    }
    const [sourceId, targetId] = listingIds; opportunityId = await promoteListing(targetId);
    const values = { gtin: "", brand: `TEST ${tag}`, mpn: "AB-12", packUnits: "1", variantKey: "BLUE / 10 CM", sourceUrl: "https://example.com/fixture", observedAt: new Date(Date.now()-1000).toISOString(), note: "HTTP TEST FIXTURE: identifiers used only for technical checks." };
    const sourcePath = `/matching?listing=${sourceId}`;
    let form = forms(await page(sourcePath)).find(f => f.includes('name="gtin"')); assert.ok(form);
    const unauth = await submit(sourcePath, form, values, false); assert.equal(unauth.status, 303); assert.equal(unauth.headers.get("location"), "/login");
    assert.equal(await prisma.listingIdentity.count({ where: { listingId: sourceId } }), 0);
    const cross = await submit(sourcePath, form, values, true, "https://wrong.example"); assert.ok(cross.status >= 400); assert.equal(await prisma.listingIdentity.count({ where: { listingId: sourceId } }), 0);
    const bad = await submit(sourcePath, form, { ...values, gtin: "036000291453" }); assert.equal(bad.status, 200); assert.equal(await prisma.listingIdentity.count({ where: { listingId: sourceId } }), 0);
    for (const listingId of listingIds) {
      const path = `/matching?listing=${listingId}`;
      form = forms(await page(path)).find(f => f.includes('name="gtin"')); assert.ok(form);
      const response = await submit(path, form, values); assert.equal(response.status, 200);
      assert.equal((await prisma.listingIdentity.findUniqueOrThrow({ where: { listingId } })).revision, 1);
    }
    let html = await page(sourcePath); assert.ok(html.includes("Same brand and manufacturer part number"));
    form = forms(html).find(f => f.includes('name="targetListingId"')); assert.ok(form);
    const incomplete = await submit(sourcePath, form, { note: values.note }); assert.equal(incomplete.status, 200);
    assert.equal((await prisma.sourceListing.findUniqueOrThrow({ where: { id: sourceId } })).opportunityId, null);
    const linked = await submit(sourcePath, form, { confirmed: "on", note: values.note }); assert.equal(linked.status, 200);
    assert.equal((await prisma.sourceListing.findUniqueOrThrow({ where: { id: sourceId } })).opportunityId, opportunityId);
    html = await page(sourcePath); assert.ok(html.includes("Undo a reviewed link"));
    assert.ok(html.replace(/<!--.*?-->/g, "").includes("Identifier revision 1"));
    form = forms(html).find(f => f.includes('name="opportunityId"')); assert.ok(form);
    const undo = await submit(sourcePath, form, { confirmed: "on", note: "HTTP TEST FIXTURE: undo the match while retaining the research record." }); assert.equal(undo.status, 200);
    assert.equal((await prisma.sourceListing.findUniqueOrThrow({ where: { id: sourceId } })).opportunityId, null);
    assert.equal(await prisma.listingLinkDecision.count({ where: { listingId: sourceId } }), 2);
    assert.ok(await prisma.opportunity.findUnique({ where: { id: opportunityId } }));
    console.log("PASS: protected matching page/actions, origin checks, invalid GTIN rejection, identifier form persistence, review confirmation, link and undo forms, audit history rendering");
  } finally {
    await prisma.listingLinkDecision.deleteMany({ where: { listingId: { in: listingIds } } });
    await prisma.identityRevision.deleteMany({ where: { listingId: { in: listingIds } } });
    await prisma.sourceListing.deleteMany({ where: { provider } });
    if (opportunityId) await prisma.opportunity.deleteMany({ where: { id: opportunityId } });
  }
}
main().catch(e => { console.error(e instanceof Error ? e.message : "Matching HTTP check failed"); process.exitCode = 1; }).finally(async () => { await cleanupTestSessions(); await prisma.$disconnect(); });
