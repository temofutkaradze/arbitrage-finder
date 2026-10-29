import assert from "node:assert/strict";
import { authenticatedFetch, cleanupTestSessions } from "./test-auth";
import { prisma } from "../src/lib/db/prisma";
const ids: number[] = [];
let supplierListingId: number | undefined;
let supplierMarketId: number | undefined;
async function main() {
  const base = "http://127.0.0.1:3000";
  assert.equal((await fetch(`${base}/products`, { redirect: "manual" })).status, 307);
  const name = `workspace-check-${crypto.randomUUID()}`;
  for (let i = 0; i < 102; i++) {
    const p = await prisma.opportunity.create({ data: { name: `${name}-${i}`, isSample: i === 101 } });
    ids.push(p.id);
  }
  const market = await prisma.market.create({ data: { code: `CJ-${crypto.randomUUID()}`, name: "Supplier progress test", countryCode: "GE", currency: "USD" } });
  supplierMarketId = market.id;
  await prisma.evaluation.create({ data: { opportunityId: ids[100], marketId: market.id } });
  const listing = await prisma.sourceListing.create({ data: { opportunityId: ids[100], provider: "cj", importedVia: "CJ_API", externalId: name, name: "CJ progress fixture", url: "https://example.com/fixture", currency: "USD", observedAt: new Date(), variants: { create: { externalId: name, name: "Exact variant fixture", priceMinor: 1234, origins: [{countryCode:"CN",totalInventory:7,cjInventory:7,factoryInventory:0}], observedAt: new Date() } } }, include: { variants: true } });
  supplierListingId = listing.id;
  await prisma.shippingQuote.create({ data: { variantId: listing.variants[0].id, marketId: market.id, originCountry: "CN", destinationCountry: "GE", postalCode: "0100", method: "Fixture shipping", productPriceMinor: 1234, productObservedAt: new Date(), shippingMinor: 567, observedAt: new Date(), expiresAt: new Date(Date.now()-1000) } });
  const importsBefore = await prisma.importRun.count();
  const html = await (await authenticatedFetch(`${base}/products?q=${name}`)).text();
  assert.ok(html.includes("კვლევის პროგრესი"));
  assert.ok(html.includes("CJ progress fixture"));
  assert.ok(html.includes("USD 12.34"));
  assert.ok(html.includes("მოძველებულია — განაახლე"));
  assert.ok(html.includes("ბოლო შენახვა CJ quote-ის გამოყენებას არ ადასტურებს"));
  assert.equal(await prisma.importRun.count(), importsBefore);
  const detail = await (await authenticatedFetch(`${base}/opportunities/${ids[100]}`)).text();
  assert.ok(detail.includes('id="add-market"'));
  assert.ok(detail.includes("Exact variant fixture"));
  assert.ok(html.includes(`/opportunities/${ids[100]}`), "Newest unevaluated real product is visible");
  assert.ok(!html.includes(`/opportunities/${ids[101]}`), "Samples excluded");
  assert.ok(!html.includes(`/opportunities/${ids[75]}`), "First page bounded to 25");
  const next = await (await authenticatedFetch(`${base}/products?q=${name}&before=${ids[76]}`)).text();
  assert.ok(next.includes(`/opportunities/${ids[75]}`), "Next page preserves search");
  assert.ok(!next.includes(`/opportunities/${ids[76]}`), "Cursor does not repeat previous row");
  const research = await (await authenticatedFetch(`${base}/research?product=${ids[0]}`)).text();
  assert.ok(research.includes(`value="${ids[0]}" selected=""`), "Product outside recent 100 is selectable");
  assert.ok(research.includes("Research sources"));
  assert.equal((await authenticatedFetch(`${base}/products?before=bad`)).status, 404);
  const study = await (await authenticatedFetch(`${base}/market-study`)).text();
  assert.ok(study.includes("ეს კვლევა AI ასისტენტმა მოამზადა"));
  assert.ok(study.includes('href="/products"'));
  console.log("PASS: protected product workspace, unevaluated items, sample exclusion, search pagination, older-product research and explicit study provenance");
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => {
  if (supplierListingId) await prisma.sourceListing.deleteMany({where:{id:supplierListingId}});
  await prisma.opportunity.deleteMany({ where: { id: { in: ids } } });
  if (supplierMarketId) await prisma.market.deleteMany({where:{id:supplierMarketId}});
  await cleanupTestSessions();
  await prisma.$disconnect();
});
