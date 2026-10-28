import { afterEach, describe, expect, it, vi } from "vitest";
import { parseImport } from "./schema";
import { normalizeCjPage, discoverCj, requestCj } from "./cj";
const row = {provider:"supplier",externalId:"p1",variantId:"red",name:"Test fixture",url:"https://example.com/product",currency:"USD",priceMinor:1234,observedAt:"2026-01-01T00:00:00Z"};
const now = new Date("2026-02-01T00:00:00Z");
describe("catalogue validation", () => {
  it("preserves exact minor units and unknown quotes", () => {
    expect(parseImport(JSON.stringify([row]), now)[0].priceMinor).toBe(1234);
    expect(parseImport(JSON.stringify([{...row,priceMinor:null}]), now)[0].priceMinor).toBeNull();
  });
  it.each([{priceMinor:-1},{priceMinor:1.2},{currency:"JPY"},{url:"javascript:alert(1)"},{url:"https://name:secret@example.com/"},{observedAt:"2027-01-01T00:00:00Z"}])("rejects unsafe or misleading values %o", (patch) => {
    expect(() => parseImport(JSON.stringify([{...row,...patch}]),now)).toThrow();
  });
  it("rejects duplicate identities but keeps variants distinct", () => {
    expect(() => parseImport(JSON.stringify([row,row]),now)).toThrow(/Duplicate/);
    expect(parseImport(JSON.stringify([row,{...row,variantId:"blue"}]),now)).toHaveLength(2);
  });
  it("bounds batch size", () => {
    expect(() => parseImport(JSON.stringify(Array.from({length:101},(_,i)=>({...row,externalId:String(i)}))),now)).toThrow();
  });
});
describe("CJ catalogue normalisation", () => {
  it("uses documented USD catalogue values without inventing variant costs", () => {
    const rows=normalizeCjPage({content:[{productList:[{id:"1",nameEn:"Fixture",sellPrice:"12.34"},{id:"2",nameEn:"Range",sellPrice:"2.00--9.00"}]}]},now);
    expect(rows.map((r)=>r.priceMinor)).toEqual([1234,null]);
    expect(rows[0].variantId).toBe("");
    expect(rows[0].currency).toBe("USD");
  });
  it("fails on changed provider response shapes",()=>expect(()=>normalizeCjPage({list:[]},now)).toThrow());
  it("requires credentials without making a request",async()=>{
    await expect(discoverCj("fixture", "")).rejects.toThrow(/not configured/);
  });
});

describe("CJ access errors and API-key exchange", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("exchanges an API Key once and reuses the derived token", async () => {
    const page = {code:200,result:true,data:{content:[{productList:[{id:"fixture",nameEn:"Test fixture",sellPrice:"1.23"}]}]}};
    const mock = vi.fn()
      .mockResolvedValueOnce(new Response("", {status:401}))
      .mockResolvedValueOnce(new Response(JSON.stringify({code:200,result:true,data:{accessToken:"derived-test-token"}})))
      .mockResolvedValue(new Response(JSON.stringify(page)));
    vi.stubGlobal("fetch", mock);
    const rows=await discoverCj("fixture", "test-only-api-key");
    expect(rows[0].priceMinor).toBe(123);
    expect(mock.mock.calls[1][0]).toContain("authentication/getAccessToken");
    expect(mock.mock.calls[2][1].headers["CJ-Access-Token"]).toBe("derived-test-token");
    mock.mockResolvedValueOnce(new Response(JSON.stringify(page)));
    await discoverCj("fixture", "test-only-api-key");
    expect(mock).toHaveBeenCalledTimes(4);
    expect(mock.mock.calls[3][1].headers["CJ-Access-Token"]).toBe("derived-test-token");
  });
  it("uses an accepted access token directly without exchange", async () => {
    const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify({code:200,result:true,data:{content:[{productList:[]}]}})));
    vi.stubGlobal("fetch",mock);
    expect(await discoverCj("fixture", "test-only-direct-token")).toEqual([]);
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("stops after a derived token is also rejected", async () => {
    const mock=vi.fn().mockResolvedValueOnce(new Response("",{status:401}))
      .mockResolvedValueOnce(new Response(JSON.stringify({code:200,result:true,data:{accessToken:"test-only-rejected-derived-token"}})))
      .mockResolvedValueOnce(new Response("",{status:401}));
    vi.stubGlobal("fetch",mock);
    await expect(discoverCj("fixture", "test-only-rejected-key")).rejects.toThrow(/authentication failed/);
    expect(mock).toHaveBeenCalledTimes(3);
  });
  it("accepts documented inventory success envelopes without a result flag", async () => {
    const data={variantInventories:[]};const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify({code:200,success:true,data})));
    vi.stubGlobal("fetch",mock);
    expect(await requestCj("product/stock/getInventoryByPid",{pid:"fixture"},undefined,"test-inventory-token")).toEqual(data);
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("posts a read-only freight payload on the fixed CJ host", async () => {
    const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify({code:200,result:true,data:[]})));
    vi.stubGlobal("fetch",mock);
    const payload={startCountryCode:"CN",endCountryCode:"GB",zip:"SW1A 1AA",products:[{quantity:1,vid:"fixture"}]};
    expect(await requestCj("logistic/freightCalculate",{},payload,"test-freight-token")).toEqual([]);
    expect(String(mock.mock.calls[0][0])).toBe("https://developers.cjdropshipping.com/api2.0/v1/logistic/freightCalculate");
    expect(mock.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(mock.mock.calls[0][1].body)).toEqual(payload);
  });
  it("does not exchange credentials on rate limiting", async () => {
    const mock=vi.fn().mockResolvedValue(new Response("", {status:429}));vi.stubGlobal("fetch",mock);
    await expect(discoverCj("fixture", "test-only-quota-credential")).rejects.toThrow(/rate limit/);
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("does not expose rejected credentials or upstream bodies", async () => {
    const mock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({code:1600001,result:false,data:null})))
      .mockResolvedValueOnce(new Response(JSON.stringify({code:1601000,result:false,data:null,message:"private upstream detail"})));
    vi.stubGlobal("fetch",mock);
    await expect(discoverCj("fixture", "test-only-invalid-credential")).rejects.toThrow(/not accepted as an access token or API Key/);
    expect(mock).toHaveBeenCalledTimes(2);
  });
});
