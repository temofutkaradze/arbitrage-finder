import { z } from "zod";
import { sourceUrl,CURRENCIES } from "../discovery/schema";
const offer=z.object({title:z.string().trim().min(1).max(500),merchant:z.string().trim().min(1).max(100),url:sourceUrl,
 priceMinor:z.number().int().positive().max(2000000000),observedAt:z.iso.datetime(),expiresAt:z.iso.datetime()}).strict();
const schema=z.object({destinationCountry:z.string().regex(/^[A-Z]{2}$/),currency:z.enum(CURRENCIES),offers:z.array(offer).min(1).max(50)}).strict();
export function parseOfferImport(raw:string,now=new Date()){
 if(new TextEncoder().encode(raw).length>200000)throw new Error("Maximum 200 KB.");
 const batch=schema.parse(JSON.parse(raw));const seen=new Set<string>();
 for(const o of batch.offers){
  const u=new URL(o.url);u.hash="";o.url=u.toString();
  if(seen.has(o.url))throw new Error("Duplicate source URLs.");seen.add(o.url);
  const observed=new Date(o.observedAt),expires=new Date(o.expiresAt);
  if(observed>now||expires<=now||expires<=observed||expires.getTime()-observed.getTime()>86400000)throw new Error("Use current observations and an expiry within 24 hours of observation.");
 }
 return batch;
}
export type OfferImport=ReturnType<typeof parseOfferImport>;
