import { z } from "zod";
import { sourceUrl } from "../discovery/schema";
const clean = z.string().trim().transform(s => s.replace(/\r\n?/g, "\n")).refine(s => !/[\u0000-\u0008\u000b-\u001f\u007f]/.test(s), "Control characters are not allowed");
export const draftSchema = z.object({
  title: clean.pipe(z.string().min(1).max(200)),
  description: clean.pipe(z.string().min(20).max(10000)),
  sources: z.string().max(10000).transform(s => s.split(/\r?\n/).map(x => x.trim()).filter(Boolean)).pipe(z.array(sourceUrl).min(1).max(10)),
  reviewed: z.literal("on"),
});
const escapeHtml = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
export function buildStoreDraft(raw: unknown, product: { id: number; name: string; updatedAt: Date; isSample: boolean }, now = new Date()) {
  const input = draftSchema.parse(raw);
  return {
    format: "arbitrage-store-preparation-v1", state: "REVIEW_REQUIRED", generatedAtUtc: now.toISOString(),
    research: { opportunityId: product.id, name: product.name, updatedAtUtc: product.updatedAt.toISOString(), sample: product.isSample, claimSourceUrls: [...new Set(input.sources)], claimsReview: "OPERATOR_REPORTED" },
    shopifyProductInput: { title: input.title, descriptionHtml: input.description.split(/\r?\n/).map(line => `<p>${escapeHtml(line)}</p>`).join("\n"), status: "DRAFT", tags: ["research-draft"] },
    limitations: ["Local review file only; not Shopify Admin CSV or a complete GraphQL request. No shop was contacted or changed.", "Description was entered and reviewed by the operator, not independently verified.", "No price, currency, market, variant, inventory, shipping promise or image licence is established by this file.", "No images are included. Confirm image reuse rights before adding assets.", "Review exact supplier variant, delivered costs, taxes, demand, compliance and returns before selling.", "A later Shopify integration needs separate account permissions, error handling and explicit authorization. Do not publish this draft automatically."],
    reviewChecklist: ["Select commercial market and currency", "Confirm exact variant, supplier and fulfilment", "Review landed costs, fees, tax, returns and CAC", "Verify every customer-facing claim and product safety requirements", "Confirm rights for any future images and branding", "Approve final price and store draft separately"],
  };
}
