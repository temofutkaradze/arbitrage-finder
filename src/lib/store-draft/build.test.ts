import { expect, it } from "vitest";
import { buildStoreDraft } from "./build";
const product = { id: 1, name: "Research item", updatedAt: new Date(0), isSample: false };
const input = { title: "Reviewed product", description: "A plain text description that has been checked.", sources: "https://example.com/product", reviewed: "on" };
it("requires explicit review and valid source URLs", () => {
  for (const change of [{ reviewed: "" }, { sources: "" }, { sources: "javascript:alert(1)" }, { sources: "https://user:secret@example.com" }, { description: "tiny" }]) expect(() => buildStoreDraft({ ...input, ...change }, product)).toThrow();
});
it("escapes customer text and fixes status as draft without price or publication fields", () => {
  const result = buildStoreDraft({ ...input, description: '<script>alert("unsafe")</script> & a reviewed product description', status: "ACTIVE", price: "0" }, product);
  expect(result.shopifyProductInput.descriptionHtml).toContain("&lt;script&gt;");
  expect(buildStoreDraft({ ...input, description: "Reviewed description line one.\r\nReviewed description line two." }, product).shopifyProductInput.descriptionHtml).toContain("</p>\n<p>");
  expect(result.shopifyProductInput.descriptionHtml).not.toContain("<script>");
  expect(result.shopifyProductInput.status).toBe("DRAFT");
  expect(result.shopifyProductInput).not.toHaveProperty("price"); expect(result.shopifyProductInput).not.toHaveProperty("images");
  expect(result.state).toBe("REVIEW_REQUIRED");
});
it("deduplicates source context and does not copy private research notes", () => {
  const withNotes = { ...product, notes: "Private costs" };
  const result = buildStoreDraft({ ...input, sources: input.sources + "\n" + input.sources }, withNotes);
  expect(result.research.claimSourceUrls).toHaveLength(1); expect(JSON.stringify(result)).not.toContain("Private costs");
});
