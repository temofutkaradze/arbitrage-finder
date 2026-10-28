import { z } from "zod";
import { sourceUrl, CURRENCIES } from "../discovery/schema";
const date = z.iso.date().transform(s=>new Date(`${s}T00:00:00Z`));
export const competitorSchema = z.object({
  opportunityId:z.coerce.number().int().positive(),marketId:z.coerce.number().int().positive(),
  merchant:z.string().trim().min(1).max(100),url:sourceUrl,
  match:z.enum(["EXACT","EQUIVALENT","UNCERTAIN"]),comparison:z.string().trim().min(20).max(2000),
  priceMinor:z.coerce.number().int().positive().max(2000000000),
  shippingMinor:z.preprocess(v=>v===""?null:v,z.coerce.number().int().nonnegative().max(2000000000).nullable()),
  currency:z.enum(CURRENCIES),taxBasis:z.enum(["INCLUDED","EXCLUDED","UNKNOWN"]),observedAt:date,expiresAt:date,
}).refine(v=>v.observedAt<=new Date()&&v.expiresAt>v.observedAt,"Check dates");
type Observation={url?:string;observedAt?:Date;match:string;currency:string;taxBasis:string;priceMinor:number;shippingMinor:number|null;expiresAt:Date};
export function comparisonGroups(rows:Observation[],now=new Date()) {
  const groups=new Map<string,number[]>();
  const seen=new Set<string>();
  for(const r of [...rows].sort((a,b)=>(b.observedAt?.getTime()??0)-(a.observedAt?.getTime()??0))){
    if(r.url){if(seen.has(r.url))continue;seen.add(r.url);}
    if(r.match==="UNCERTAIN"||r.shippingMinor===null||r.taxBasis==="UNKNOWN"||r.expiresAt<=now)continue;
    const key=`${r.currency} / tax ${r.taxBasis.toLowerCase()}`;
    groups.set(key,[...(groups.get(key)??[]),r.priceMinor+r.shippingMinor]);
  }
  return [...groups].map(([basis,values])=>{
    values.sort((a,b)=>a-b);const mid=Math.floor(values.length/2);
    return {basis,count:values.length,min:values[0],max:values[values.length-1],median:values.length%2?values[mid]:(values[mid-1]+values[mid])/2};
  });
}
export function researchLinks(term:string,country?:string|null){
  const trends=new URL("https://trends.google.com/trends/explore");trends.searchParams.set("q",term);if(country)trends.searchParams.set("geo",country);
  const ebay=new URL("https://www.ebay.com/sch/i.html");ebay.searchParams.set("_nkw",term);
  return {trends:trends.toString(),ebay:ebay.toString(),meta:"https://www.facebook.com/ads/library/",tiktok:"https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en"};
}
