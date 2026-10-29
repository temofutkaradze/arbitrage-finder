import {afterEach,expect,it,vi} from "vitest";
import {normalizeEbay,searchEbay} from "./ebay";
const item={buyingOptions:["FIXED_PRICE"],itemId:"test",title:"Fixture",itemWebUrl:"https://www.ebay.co.uk/itm/test",price:{value:"12.34",currency:"GBP"},seller:{username:"fixture-seller"}};
afterEach(()=>vi.unstubAllGlobals());
it("reads fixed-price offers without inventing shipping or demand",()=>{
 const [offer]=normalizeEbay({itemSummaries:[item]},"GBP");expect(offer.priceMinor).toBe(1234);expect(offer).not.toHaveProperty("shippingMinor");
 expect(normalizeEbay({total:0},"GBP")).toEqual([]);
});
it("rejects changed schema, duplicate IDs, wrong currencies, unsafe URLs and auctions",()=>{
 for(const patch of [{price:{value:"1.234",currency:"GBP"}},{price:{value:"1",currency:"USD"}},{itemWebUrl:"https://evil.example/p"},{buyingOptions:["AUCTION"]}])expect(()=>normalizeEbay({itemSummaries:[{...item,...patch}]},"GBP")).toThrow();
 expect(()=>normalizeEbay({},"GBP")).toThrow();expect(()=>normalizeEbay({itemSummaries:[item,item]},"GBP")).toThrow();
});
it("requires credentials without a network request",async()=>{
 const mock=vi.fn();vi.stubGlobal("fetch",mock);await expect(searchEbay("fixture","GB","GBP","")).rejects.toThrow(/not connected/);expect(mock).not.toHaveBeenCalled();
});
it("scopes the fixed-host search to the explicit market and fixed-price listings",async()=>{
 const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify({itemSummaries:[item]})));vi.stubGlobal("fetch",mock);
 await searchEbay("fixture","GB","GBP","test-only-token");const url=new URL(String(mock.mock.calls[0][0]));
 expect(url.host).toBe("api.ebay.com");expect(url.searchParams.get("limit")).toBe("20");expect(url.searchParams.get("filter")).toContain("buyingOptions:{FIXED_PRICE}");expect(mock.mock.calls[0][1].headers["X-EBAY-C-MARKETPLACE-ID"]).toBe("EBAY_GB");
});
it("does not leak upstream authentication errors",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("private upstream detail",{status:401})));
 await expect(searchEbay("fixture","GB","GBP","test-only-token")).rejects.toThrow(/token was rejected/);
});
