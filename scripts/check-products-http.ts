import assert from "node:assert/strict";
import { authenticatedFetch, cleanupTestSessions } from "./test-auth";
import { prisma } from "../src/lib/db/prisma";
const ids: number[] = [];
async function main() {
  const base = "http://127.0.0.1:3000";
  assert.equal((await fetch(`${base}/products`, { redirect: "manual" })).status, 307);
  const name = `workspace-check-${crypto.randomUUID()}`;
  for (let i = 0; i < 102; i++) {
    const p = await prisma.opportunity.create({ data: { name: `${name}-${i}`, isSample: i === 101 } });
    ids.push(p.id);
  }
  const html = await (await authenticatedFetch(`${base}/products?q=${name}`)).text();
  assert.ok(html.includes("კვლევის პროგრესი"));
  assert.ok(html.includes(`/opportunities/${ids[100]}#add-market`));
  const detail = await (await authenticatedFetch(`${base}/opportunities/${ids[100]}`)).text();
  assert.ok(detail.includes('id="add-market"'));
  assert.ok(detail.includes("აირჩიე ბაზარი"));
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
  await prisma.opportunity.deleteMany({ where: { id: { in: ids } } });
  await cleanupTestSessions();
  await prisma.$disconnect();
});
