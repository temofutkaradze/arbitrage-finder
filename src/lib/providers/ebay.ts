import {getEbayToken} from "./ebay-auth";
import { z } from "zod";
import { usdMinor } from "../sourcing/schema";
import { configureProxyFromEnvironment } from "../discovery/network";
export const EBAY_MARKETS: Record<string,{id:string;currency:string}> = {
 US:{id:"EBAY_US",currency:"USD"},GB:{id:"EBAY_GB",currency:"GBP"},DE:{id:"EBAY_DE",currency:"EUR"},FR:{id:"EBAY_FR",currency:"EUR"},
 IT:{id:"EBAY_IT",currency:"EUR"},ES:{id:"EBAY_ES",currency:"EUR"},CA:{id:"EBAY_CA",currency:"CAD"},AU:{id:"EBAY_AU",currency:"AUD"},
};
const item=z.object({buyingOptions:z.array(z.string()).refine(v=>v.includes("FIXED_PRICE")),itemId:z.string().min(1).max(200),title:z.string().min(1).max(500),
 itemWebUrl:z.string().url().refine(s=>{const u=new URL(s);return u.protocol==="https:"&&!u.username&&!u.password&&/^(www\.|m\.)?ebay\.(com|co\.uk|com\.au|ca|de|fr|it|es)$/.test(u.hostname);}),
 price:z.object({value:z.string(),currency:z.string()}),seller:z.object({username:z.string().min(1).max(100)}),
});
export function normalizeEbay(payload:unknown,currency:string){
 const page=z.object({total:z.number().int().nonnegative().optional(),itemSummaries:z.array(item).max(20).optional()}).parse(payload);
 if(!page.itemSummaries&&page.total!==0)throw new Error("eBay response missing offers");
 const seen=new Set<string>();
 return (page.itemSummaries??[]).map(row=>{
  if(seen.has(row.itemId)||row.price.currency!==currency)throw new Error("eBay duplicate or currency mismatch");seen.add(row.itemId);
  const priceMinor=usdMinor(row.price.value);if(priceMinor===null||priceMinor===0)throw new Error("eBay invalid price");
  return {provider:"ebay",externalId:row.itemId,title:row.title,merchant:row.seller.username,url:row.itemWebUrl,priceMinor,currency};
 });
}
export async function searchEbay(query:string,country:string,currency:string,token?:string){
 if(token==="")throw new Error("eBay is not connected. A production Browse API application access token and account eligibility are required. Manual research remains available.");
 const market=EBAY_MARKETS[country];if(!market||market.currency!==currency)throw new Error("eBay market/currency combination is not supported. Choose a matching configured destination; no default marketplace is assumed.");
 if(query.trim().length<2||query.length>100)throw new Error("eBay search phrase must contain 2–100 characters.");
 token=token??await getEbayToken();
 configureProxyFromEnvironment();
 const url=new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");url.searchParams.set("q",query.trim());url.searchParams.set("limit","20");url.searchParams.set("filter",`deliveryCountry:${country},buyingOptions:{FIXED_PRICE}`);
 let response:Response;try{response=await fetch(url,{headers:{Authorization:`Bearer ${token}`,"X-EBAY-C-MARKETPLACE-ID":market.id},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(20000)});}catch{throw new Error("eBay request could not complete. No offers were saved.");}
 if(response.status===401){getEbayToken.invalidate(token);throw new Error("eBay token was rejected or expired. Automatic credentials will be checked again on your next search; manually supplied tokens need secure replacement. No automatic search retry was sent.");}
 if(response.status===403)throw new Error("eBay production access was denied. Confirm Browse API eligibility and scopes with eBay.");
 if(response.status===429)throw new Error("eBay rate limit reached. Wait before trying again.");
 if(!response.ok)throw new Error(`eBay returned HTTP ${response.status}. No offers were saved.`);
 return normalizeEbay(await response.json(),currency);
}
