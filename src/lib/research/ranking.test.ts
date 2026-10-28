import { expect, it } from "vitest";
import { calculate } from "../profit/calculate";
import { INPUT_KEYS, type Inputs } from "../profit/types";
import { compareOpportunities, decisionTier } from "./ranking";
const research={label:"Evidence recorded",missing:[] as string[],next:"Review"};
function row(price=10000,currency="USD") {
 const inputs:Inputs=Object.fromEntries(INPUT_KEYS.map(k=>[k,{value:0,status:"VERIFIED"}]));
 inputs.sellingPrice={value:price,status:"ESTIMATED"};inputs.supplierPrice={value:1000,status:"VERIFIED"};
 return {currency,research,result:calculate(inputs,{pricesIncludeTax:false})};
}
it("never compares raw profits across currencies",()=>{
 const euro=row(2000,"EUR"),usd=row(100000,"USD");
 expect(compareOpportunities(euro,usd,"net")).toBeLessThan(0);
 expect(compareOpportunities(row(10000),row(20000),"net")).toBeGreaterThan(0);
});
it("missing optional costs cannot qualify for the top review tier",()=>{
 const complete=row();expect(decisionTier(complete)).toBe(0);
 if(!complete.result.complete)throw new Error("fixture must be complete");
 expect(decisionTier({...complete,result:{...complete.result,assumedZero:["otherCosts"]}})).toBe(1);
 expect(decisionTier({...complete,research:{...research,label:"Risk review"}})).toBe(3);
 expect(decisionTier({...complete,result:{complete:false,quality:"incomplete",missing:["cac"]}})).toBe(2);
 expect(decisionTier(row(500))).toBe(3);
});
