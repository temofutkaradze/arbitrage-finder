import { beforeEach,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({auth:vi.fn(),listing:vi.fn(),quotes:vi.fn(),variants:vi.fn(),quote:vi.fn(),reserve:vi.fn(),refresh:vi.fn(),freight:vi.fn()}));
vi.mock("@/lib/auth/server",()=>({requireOwner:mocks.auth}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/lib/db/prisma",()=>({prisma:{sourceListing:{findUniqueOrThrow:mocks.listing},shippingQuote:{findMany:mocks.quotes,findUniqueOrThrow:mocks.quote},supplierVariant:{findMany:mocks.variants}}}));
vi.mock("@/lib/sourcing/service",()=>({reserveCjOperation:mocks.reserve,refreshVariants:mocks.refresh,fetchFreight:mocks.freight}));
import { startProductRefresh,refreshSavedRoute } from "../../app/(protected)/discovery/[id]/refresh-actions";
const v={id:1,externalId:"v1",sku:"sku1",priceMinor:100,origins:[],active:true};
const q={id:1,shippingMinor:100,variantId:1,marketId:1,originCountry:"US",destinationCountry:"US",postalCode:"95829",market:{code:"US",countryCode:"US"},variant:{active:true,listingId:2,listing:{provider:"cj",importedVia:"CJ_API",opportunityId:1}}};
beforeEach(()=>{vi.resetAllMocks();mocks.listing.mockResolvedValue({provider:"cj",importedVia:"CJ_API",opportunityId:1,variants:[v]});mocks.variants.mockResolvedValue([{...v,priceMinor:200}]);mocks.quotes.mockResolvedValue([q]);mocks.quote.mockResolvedValue(q);mocks.freight.mockResolvedValue(2);});
it("authenticates before reading or reserving",async()=>{mocks.auth.mockRejectedValue(new Error("denied"));await expect(startProductRefresh(2)).rejects.toThrow("denied");expect(mocks.listing).not.toHaveBeenCalled();expect(mocks.reserve).not.toHaveBeenCalled();});
it("reports a price change and planned saved routes without applying financial data",async()=>{const r=await startProductRefresh(2);expect(r.ok).toBe(true);expect(r.changes[0]).toContain("USD 1.00 → USD 2.00");expect(r.routes[0].quoteId).toBe(1);expect(mocks.refresh).toHaveBeenCalledWith(2);expect(mocks.freight).not.toHaveBeenCalled();});
it("stops when the shared CJ cooldown rejects the reservation",async()=>{mocks.reserve.mockRejectedValue(new Error("Wait 30 seconds between CJ operations."));const r=await startProductRefresh(2);expect(r.ok).toBe(false);expect(mocks.refresh).not.toHaveBeenCalled();expect(r.routes).toEqual([]);});
it("does not request an old destination after the market country changes",async()=>{mocks.quote.mockResolvedValue({...q,market:{code:"US",countryCode:"GE"}});expect((await refreshSavedRoute(2,1)).ok).toBe(false);expect(mocks.reserve).not.toHaveBeenCalled();expect(mocks.freight).not.toHaveBeenCalled();});
it("rejects routes from another listing and inactive variants",async()=>{expect((await refreshSavedRoute(3,1)).ok).toBe(false);mocks.quote.mockResolvedValue({...q,variant:{...q.variant,active:false}});expect((await refreshSavedRoute(2,1)).ok).toBe(false);expect(mocks.freight).not.toHaveBeenCalled();});
it("requests the saved route once, without retrying a failure",async()=>{mocks.freight.mockRejectedValue(new Error("secret error body"));const r=await refreshSavedRoute(2,1);expect(r.ok).toBe(false);expect(r.message).not.toContain("secret");expect(mocks.freight).toHaveBeenCalledTimes(1);expect(mocks.freight).toHaveBeenCalledWith({variantId:1,marketId:1,originCountry:"US",postalCode:"95829"});});

it("summarizes new shipping without changing an evaluation",async()=>{const r=await refreshSavedRoute(2,1);expect(r.ok).toBe(true);expect(r.message).toContain("USD 1.00");expect(mocks.freight).toHaveBeenCalledTimes(1);});
