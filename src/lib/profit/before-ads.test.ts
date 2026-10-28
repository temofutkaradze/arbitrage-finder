import { expect, it } from "vitest";
import { calculateBeforeAds } from "./before-ads";
import { calculate } from "./calculate";
import type { Inputs } from "./types";
const v=(value:number)=>({value,status:"ESTIMATED" as const});
it("shows an ad spending ceiling without claiming profit when CAC is unknown",()=>{
 const inputs:Inputs={sellingPrice:v(10000),supplierPrice:v(4000),shippingToCustomer:v(1000),importDutyPct:v(0),taxRate:v(0),paymentFeePct:v(300),paymentFeeFixed:v(30),returnRatePct:v(500),returnCostPerReturn:v(3000)};
 expect(calculate(inputs,{pricesIncludeTax:false}).complete).toBe(false);
 expect(calculateBeforeAds(inputs,{pricesIncludeTax:false})?.contribution).toBe(4520);
 expect(calculateBeforeAds({...inputs,supplierPrice:{value:null,status:"UNKNOWN"}},{pricesIncludeTax:false})).toBeNull();
});
