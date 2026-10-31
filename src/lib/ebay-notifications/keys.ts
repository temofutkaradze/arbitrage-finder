import {z} from "zod";
import {getEbayToken} from "../providers/ebay-auth";
import {configureProxyFromEnvironment} from "../discovery/network";
const keys=new Map<string,{key:string;expires:number}>();
let lastMiss=0;
export async function notificationKey(kid:string){
 const old=keys.get(kid);if(old&&old.expires>Date.now())return old.key;
 // Bound unauthenticated cache misses; no arbitrary URL or automatic retries.
 if(Date.now()-lastMiss<1000)throw new Error("Key lookup throttled");lastMiss=Date.now();
 let token:string;
 try{token=await getEbayToken();}catch{console.warn("eBay notification key lookup: application_authentication_failed");throw new Error("Public key authentication unavailable");}
 configureProxyFromEnvironment();
 const response=await fetch(`https://api.ebay.com/commerce/notification/v1/public_key/${encodeURIComponent(kid)}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(10000)});
 if(!response.ok){console.warn(`eBay notification key lookup: HTTP ${response.status}`);throw new Error("Public key unavailable");}
 const value=z.object({key:z.string().min(1).max(10000)}).parse(await response.json());
 if(keys.size>=20)keys.delete(keys.keys().next().value!);
 keys.set(kid,{key:value.key,expires:Date.now()+3600000});return value.key;
}
