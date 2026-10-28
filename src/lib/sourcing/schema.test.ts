import { describe, expect, it } from "vitest";
import { usdMinor, normalizeVariants, normalizeFreight, quoteRequestSchema } from "./schema";
import { convertUsdMinor } from "./convert";
const details = { pid:"p", variants:[{vid:"v",variantNameEn:"Red",variantSku:"SKU",variantSellPrice:"1.23"}] };
const stock = {variantInventories:[{vid:"v",inventory:[{countryCode:"CN",totalInventory:12,cjInventory:2,factoryInventory:10}]}]};
describe("supplier observations",()=>{
  it("preserves exact values without turning ranges or missing amounts into zero",()=>{
    expect(usdMinor("1.23")).toBe(123);expect(usdMinor(0)).toBe(0);
    for(const value of [null,undefined,"",-1,"1.234","2--4",Infinity])expect(usdMinor(value)).toBeNull();
  });
  it("joins stock at variant level and retains CJ vs factory quantities",()=>{
    expect(normalizeVariants(details,stock,"p")[0]).toMatchObject({externalId:"v",priceMinor:123,origins:[{countryCode:"CN",totalInventory:12,cjInventory:2,factoryInventory:10}]});
    expect(normalizeVariants(details,{variantInventories:[]},"p")[0].origins).toEqual([]);
  });
  it("rejects mismatched products and duplicate variant identities",()=>{
    expect(()=>normalizeVariants(details,stock,"other")).toThrow(/identity/);
    expect(()=>normalizeVariants({...details,variants:[details.variants[0],details.variants[0]]},stock,"p")).toThrow(/duplicate/);
  });
  it("does not infer free shipping or zero taxes from missing values",()=>{
    expect(normalizeFreight([{logisticName:"Carrier",logisticPrice:"4.56",logisticAging:"5-10"}])[0]).toMatchObject({shippingMinor:456,taxesMinor:null,clearanceMinor:null,totalPostageMinor:null});
    expect(()=>normalizeFreight([{logisticName:"Carrier"}])).toThrow(/shipping price/);
    expect(normalizeFreight([])).toEqual([]);
  });
  it("requires an explicit origin, market and nonpersonal postal code",()=>{
    expect(quoteRequestSchema.safeParse({variantId:1,marketId:1,originCountry:"cn",postalCode:"SW1A 1AA"}).success).toBe(true);
    expect(quoteRequestSchema.safeParse({variantId:1,marketId:1,originCountry:"",postalCode:""}).success).toBe(false);
  });
});
describe("FX conversion",()=>{
  it("uses target units per USD with exact half-up minor-unit rounding",()=>{
    expect(convertUsdMinor(10000,"0.92")).toBe(9200);
    expect(convertUsdMinor(1,"0.5")).toBe(1);
    expect(convertUsdMinor(123,"1")).toBe(123);
    expect(convertUsdMinor(100,"2.70000000")).toBe(270);
  });
  it("rejects zero, negative, exponential and overflowing rates",()=>{
    for(const rate of ["0","-1","1e3","1.123456789",""])expect(()=>convertUsdMinor(100,rate)).toThrow();
    expect(()=>convertUsdMinor(2000000000,"2")).toThrow(/range/);
  });
});
