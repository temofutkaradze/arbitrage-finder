import { expect,it } from "vitest";
import { competitorPriceScenarios, type PriceObservation } from "./price-scenarios";
import { INPUT_DEFS, type Inputs } from "../profit/types";
const now=new Date("2026-10-30T00:00:00Z");
const market={id:1,currency:"USD",pricesIncludeTax:false};
const row:PriceObservation={id:1,marketId:1,url:"https://example.com/1",observedAt:new Date("2026-10-29"),expiresAt:new Date("2026-11-01"),match:"EXACT",currency:"USD",taxBasis:"EXCLUDED",priceMinor:1900,shippingMinor:100};
const inputs:Inputs=Object.fromEntries(INPUT_DEFS.map(d=>[d.key,{value:0,status:"ESTIMATED"}]));
inputs.supplierPrice={value:1000,status:"ESTIMATED"};inputs.shippingToCustomer={value:500,status:"ESTIMATED"};inputs.cac={value:100,status:"ESTIMATED"};inputs.shippingCharged={value:999,status:"ESTIMATED"};
it("recalculates delivered price without double-counting shipping or mutating saved inputs",()=>{
 const before=JSON.stringify(inputs);const s=competitorPriceScenarios([row],inputs,market,now).groups[0].scenarios[0];
 expect(s.price).toBe(2000);expect(s.result.complete&&s.result.netProfit).toBe(400);expect(JSON.stringify(inputs)).toBe(before);
});
it("keeps exact/equivalent sources separate and rounds half-cent medians",()=>{
 const r=competitorPriceScenarios([row,{...row,id:2,url:"https://example.com/2",priceMinor:1901},{...row,id:3,url:"https://example.com/3",match:"EQUIVALENT",priceMinor:5000}],inputs,market,now);
 expect(r.groups).toHaveLength(2);expect(r.groups[0].scenarios[1].price).toBe(2001);expect(r.groups[1].scenarios[0].price).toBe(5100);
});
it("rejects other markets, currencies, taxes, expiry, future and unknown delivery",()=>{
 const variants=[{marketId:2},{currency:"GEL"},{taxBasis:"INCLUDED"},{expiresAt:now},{observedAt:new Date("2026-12-01")},{shippingMinor:null},{match:"UNCERTAIN"}];
 for(const v of variants)expect(competitorPriceScenarios([{...row,...v}],inputs,market,now).groups).toEqual([]);
});
it("does not resurrect an old exact offer when latest observation is uncertain",()=>{
 expect(competitorPriceScenarios([row,{...row,id:2,observedAt:now,match:"UNCERTAIN"}],inputs,market,now).groups).toEqual([]);
});
it("never invents missing costs",()=>{
 const result=competitorPriceScenarios([row],{},market,now).groups[0].scenarios[0].result;
 expect(result.complete).toBe(false);expect(!result.complete&&result.missing).toContain("supplierPrice");
});
