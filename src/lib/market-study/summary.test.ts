import { expect, it } from "vitest";
import { routeSummary } from "./summary";
import snapshot from "./snapshot.json";
it("does not invent a shipping result for empty or unknown routes",()=>{expect(routeSummary(3160,[])).toBeNull();expect(routeSummary(3160,null)).toBeNull();expect(routeSummary(null,[{shippingMinor:0,method:"API zero",deliveryEstimate:null}])).toBeNull();});
it("preserves genuine provider zeros without asserting landed profit",()=>{expect(routeSummary(3160,[{shippingMinor:0,method:"API zero",deliveryEstimate:"3-7"}])?.subtotalMinor).toBe(3160);});
it("reconciles the dated same-variant country comparison with the saved quotes",()=>{const c=snapshot.candidates[1];for(const [country,total] of [["GE",3252],["US",2940]] as const){const r=c.results.find(r=>r.country===country)!;expect(routeSummary(c.candidate.variants[0].priceMinor,r.quotes)?.subtotalMinor).toBe(total);expect(r.quantity).toBe(1);}expect(snapshot.candidates[0].results.find(r=>r.country==="GE")?.quotes).toEqual([]);});
