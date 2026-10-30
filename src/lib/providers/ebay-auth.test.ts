import {afterEach,expect,it,vi} from "vitest";
import {createEbayTokenManager,ebayConnectionMode} from "./ebay-auth";
import {searchEbay} from "./ebay";
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
function keys(){vi.stubEnv("EBAY_CLIENT_ID","fixture-id");vi.stubEnv("EBAY_CLIENT_SECRET","fixture-secret");}
function reply(){return new Response(JSON.stringify({access_token:"fixture-token",token_type:"Bearer",expires_in:120}));}
it("shares token minting, caches it, renews before expiry and invalidates rejected tokens",async()=>{
 keys();let now=100000;vi.spyOn(Date,"now").mockImplementation(()=>now);
 const mock=vi.fn().mockImplementation(async()=>reply());vi.stubGlobal("fetch",mock);const get=createEbayTokenManager();
 expect(await Promise.all([get(),get(),get()])).toEqual(["fixture-token","fixture-token","fixture-token"]);expect(mock).toHaveBeenCalledTimes(1);
 await get();expect(mock).toHaveBeenCalledTimes(1);now+=61000;await get();expect(mock).toHaveBeenCalledTimes(2);
 get.invalidate("other-token");await get();expect(mock).toHaveBeenCalledTimes(2);get.invalidate("fixture-token");await get();expect(mock).toHaveBeenCalledTimes(3);
 const [url,options]=mock.mock.calls[0];expect(url).toBe("https://api.ebay.com/identity/v1/oauth2/token");expect(options.redirect).toBe("error");expect(options.body.get("grant_type")).toBe("client_credentials");expect(options.body.get("scope")).toBe("https://api.ebay.com/oauth/api_scope");
});
it("does not cache failures or expose response details",async()=>{
 keys();const mock=vi.fn().mockResolvedValueOnce(new Response("fixture-secret",{status:401})).mockResolvedValueOnce(new Response("{}"));vi.stubGlobal("fetch",mock);const get=createEbayTokenManager();
 await expect(get()).rejects.toThrow(/authentication failed/);await expect(get()).rejects.toThrow(/response was invalid/);expect(mock).toHaveBeenCalledTimes(2);
});
it("rotates the cache when credentials change and keeps manual tokens available",async()=>{
 keys();const mock=vi.fn().mockImplementation(async()=>reply());vi.stubGlobal("fetch",mock);const get=createEbayTokenManager();await get();vi.stubEnv("EBAY_CLIENT_SECRET","new-fixture");await get();expect(mock).toHaveBeenCalledTimes(2);
 vi.stubEnv("EBAY_CLIENT_ID","");vi.stubEnv("EBAY_CLIENT_SECRET","");vi.stubEnv("EBAY_ACCESS_TOKEN","manual-fixture");expect(ebayConnectionMode()).toBe("manual");expect(await get()).toBe("manual-fixture");
 vi.stubEnv("EBAY_ACCESS_TOKEN","");await expect(get()).rejects.toThrow(/not connected/);
});
it("validates marketplace before minting and completes OAuth then a Browse search",async()=>{
 keys();const mock=vi.fn().mockResolvedValueOnce(reply()).mockResolvedValueOnce(new Response('{"total":0}'));vi.stubGlobal("fetch",mock);
 await expect(searchEbay("fixture","GE","GEL")).rejects.toThrow(/not supported/);expect(mock).not.toHaveBeenCalled();
 expect(await searchEbay("fixture","US","USD")).toEqual([]);expect(mock).toHaveBeenCalledTimes(2);expect(mock.mock.calls[1][1].headers.Authorization).toBe("Bearer fixture-token");
});
