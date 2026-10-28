import {expect,it} from "vitest";
import {comparisonGroups,competitorSchema,researchLinks} from "./competitors";
import {researchReadiness} from "./readiness";
const row={match:"EXACT",currency:"USD",taxBasis:"INCLUDED",priceMinor:1000,shippingMinor:200,expiresAt:new Date("2030-01-01")};
it("separates currencies and tax bases and excludes incomparable offers",()=>{
 const rows=[row,{...row,priceMinor:2000},{...row,currency:"EUR"},{...row,taxBasis:"EXCLUDED"},{...row,shippingMinor:null},{...row,match:"UNCERTAIN"},{...row,expiresAt:new Date(0)}];
 const groups=comparisonGroups(rows);expect(groups).toHaveLength(3);expect(groups[0]).toMatchObject({count:2,min:1200,max:2200,median:1700});
});
it("requires real dates, comparison notes and source-safe URLs",()=>{
 expect(competitorSchema.safeParse({}).success).toBe(false);
 expect(researchLinks("a&b").trends).toContain("q=a%26b");
 expect(researchLinks("x").trends).not.toContain("geo=");
});
it("retired concerns no longer block readiness or count as support",()=>{
 expect(researchReadiness([{kind:"PRODUCT_RISK",provenance:"OBSERVED",outcome:"CONCERN",marketId:null,expiresAt:new Date("2030-01-01"),resolvedAt:new Date()}],1).label).toBe("Needs research");
});
it("uses the latest source observation even if its match is now uncertain",()=>{
 const url="https://example.com/p";
 expect(comparisonGroups([{...row,url,observedAt:new Date("2026-01-01")},{...row,url,match:"UNCERTAIN",observedAt:new Date("2026-02-01")}])).toEqual([]);
});
