import "./test-auth";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { prisma } from "../src/lib/db/prisma";
import { newSession, configuredAuth, SESSION_COOKIE } from "../src/lib/auth/core";
import { INPUT_KEYS } from "../src/lib/profit/types";

async function main() {
  const before = process.env.DESIGN_STAGE === "before";
  const output = `/tmp/arbitrage-design-${before ? "before" : "after"}`;
  await mkdir(output, { recursive: true });
  const session = newSession();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
  let fixtureProduct: number | undefined;
  let fixtureMarket: number | undefined;
  try {
    await prisma.ownerSession.create({ data: { id: session.id, passwordVersion: configuredAuth().version, expiresAt: session.expiresAt } });
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.addCookies([{ name: SESSION_COOKIE, value: session.token, url: "http://127.0.0.1:3000" }]);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    // This inspection never sends supplier, AI or financial mutation requests.
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      return url.origin !== "http://127.0.0.1:3000" || route.request().method() === "POST" ? route.abort() : route.continue();
    });
    if (!before) {
      const market = await prisma.market.create({ data: { code: `UI-${crypto.randomUUID().slice(0, 8)}`, name: "UI TEST · United States", currency: "USD", countryCode: "US" } });
      fixtureMarket = market.id;
      const fixture = await prisma.opportunity.create({ data: { name: "UI TEST · Kitchen Organizer", sourceName: "Design check fixture", notes: "Temporary interface test; not real research.", evaluations: { create: { marketId: market.id, inputs: { create: [{ key: "supplierPrice", value: 3160, status: "ESTIMATED" }, { key: "shippingToCustomer", value: 0, status: "ESTIMATED" }] } } } } });
      fixtureProduct = fixture.id;
    }
    const product = fixtureProduct ? { id: fixtureProduct } : await prisma.opportunity.findFirst({ orderBy: { id: "asc" } });
    const listing = await prisma.sourceListing.findFirst({ where: { provider: "cj", importedVia: "CJ_API" } });
    const paths = ["/", "/products", "/discovery", "/research", "/matching", "/opportunities", "/opportunities/new", "/markets", "/automation", "/payments", "/history", "/market-study", "/login",
      ...(product ? [`/opportunities/${product.id}`, `/opportunities/${product.id}/ai`, `/opportunities/${product.id}/prepare`] : []),
      ...(listing ? [`/discovery/${listing.id}`] : [])];
    for (const width of [1440, 768, 390, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const path of paths) {
        const response = await page.goto(`http://127.0.0.1:3000${path}`);
        assert.equal(response?.status(), 200, path);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator("h1").count(), 1, `${path}: one page heading`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        if (!before) assert.equal(overflow, false, `${path} at ${width}: page overflow`);
        if (["/", "/products", "/login"].includes(path) || path === `/opportunities/${product?.id}`) {
          await page.screenshot({ path: `${output}/${path.replaceAll("/", "_") || "home"}-${width}.png`, fullPage: true });
        }
        console.log(`${width} ${path}: ${overflow ? "OVERFLOW" : "fits"}`);
      }
    }
    if (!before) {
      await page.goto(`http://127.0.0.1:3000/opportunities/${fixtureProduct}`);
      const supplier = page.locator('[name="supplierPrice__value"]');
      await supplier.fill("42.50");
      await supplier.scrollIntoViewIfNeeded();
      assert.equal(await supplier.inputValue(), "42.50");
      await page.screenshot({ path: `${output}/financial-inputs-mobile.png` });
      assert.equal((await prisma.costInput.findFirstOrThrow({ where: { evaluation: { opportunityId: fixtureProduct }, key: "supplierPrice" } })).value, 3160, "Unsubmitted editing does not save costs");
      const evaluation = await prisma.evaluation.findFirstOrThrow({ where: { opportunityId: fixtureProduct } });
      await prisma.costInput.createMany({ data: INPUT_KEYS.filter(key => key !== "supplierPrice" && key !== "shippingToCustomer").map(key => ({ evaluationId: evaluation.id, key, value: key === "sellingPrice" ? 5000 : key === "batchUnits" ? 1 : 0, status: "ESTIMATED" as const, note: "UI test fixture only" })) });
      for (const width of [375, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(`http://127.0.0.1:3000/opportunities/${fixtureProduct}`);
        const metrics = page.locator(".evaluation-metrics");
        assert.equal(await metrics.locator(":scope > div").count(), 8);
        await metrics.scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, "Complete evaluation fits");
        await page.screenshot({ path: `${output}/complete-evaluation-${width}.png` });
      }
      await page.setViewportSize({ width: 375, height: 1000 });
      await page.goto("http://127.0.0.1:3000/");
      const menu = page.getByRole("button", { name: "მენიუ", exact: true });
      await menu.click();
      assert.equal(await menu.getAttribute("aria-expanded"), "true");
      await page.locator("#workspace-navigation").getByRole("link", { name: "ჩემი პროდუქტები", exact: true }).click();
      await page.waitForURL("**/products");
      assert.equal(await menu.getAttribute("aria-expanded"), "false");
      await menu.click();
      await page.keyboard.press("Escape");
      assert.equal(await menu.getAttribute("aria-expanded"), "false");
      assert.equal(await menu.evaluate(el => el === document.activeElement), true);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.getByRole("button", { name: "მუქი თემა", exact: true }).click();
      await page.reload();
      assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
      await page.screenshot({ path: `${output}/products-dark.png`, fullPage: true });
      assert.equal(errors.length, 0, errors.join("\n"));
    }
    console.log(`PASS: ${paths.length} routes at four widths; screenshots: ${output}`);
  } finally {
    await browser.close();
    if (fixtureProduct) await prisma.opportunity.delete({ where: { id: fixtureProduct } });
    if (fixtureMarket) await prisma.market.delete({ where: { id: fixtureMarket } });
    await prisma.ownerSession.deleteMany({ where: { id: session.id } });
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Design check failed"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
