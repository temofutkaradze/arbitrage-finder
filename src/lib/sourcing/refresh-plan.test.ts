import { expect,it } from "vitest";
import { savedRefreshRoutes } from "./refresh-plan";
const q={id:1,variantId:1,marketId:1,originCountry:"US",destinationCountry:"US",postalCode:"95829",market:{code:"US-TEST",countryCode:"US"}};
it("groups shipping methods into one route without merging different ZIPs, variants or markets",()=>{
 const plan=savedRefreshRoutes([q,{...q,id:2},{...q,id:3,postalCode:"10001"},{...q,id:4,variantId:2},{...q,id:5,marketId:2}]);
 expect(plan.routes.map(r=>r.quoteId)).toEqual([1,3,4]);expect(plan.omitted).toBe(1);
});
it("does not invent a route when no quote is saved",()=>expect(savedRefreshRoutes([])).toEqual({routes:[],omitted:0}));
