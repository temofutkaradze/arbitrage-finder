import { expect, it } from "vitest";
import { quoteUsability, REPORT_FRESH_MS } from "./progress-status";
const now = new Date("2026-10-29T12:00:00Z");
const q = { destinationCountry: "GE", expiresAt: new Date(now.getTime()+10000), productObservedAt: now, productPriceMinor: 100 };
it("only labels quotes for the current destination as reviewable", () => {
 expect(quoteUsability(q,"GE",now)).toBe("review");
 expect(quoteUsability(q,"US",now)).toBe("route");
 expect(quoteUsability(q,null,now)).toBe("route");
});
it("rejects expiry boundaries, stale product observations and missing exact prices", () => {
 expect(quoteUsability({...q,expiresAt:now},"GE",now)).toBe("stale");
 expect(quoteUsability({...q,productObservedAt:new Date(now.getTime()-REPORT_FRESH_MS)},"GE",now)).toBe("stale");
 expect(quoteUsability({...q,productObservedAt:null},"GE",now)).toBe("stale");
 expect(quoteUsability({...q,productPriceMinor:null},"GE",now)).toBe("price");
});
