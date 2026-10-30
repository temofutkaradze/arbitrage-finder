import { z } from "zod";
import { configureProxyFromEnvironment } from "../discovery/network";
const schema = z.object({access_token:z.string().min(1).max(20000),token_type:z.string().regex(/^Bearer$/i),expires_in:z.number().int().min(61).max(86400)});
export function ebayConnectionMode() {
 if(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET) return "oauth";
 if(process.env.EBAY_ACCESS_TOKEN) return "manual";
 return "missing";
}
// Process-local only: no tokens are written to records, browser props or logs.
export function createEbayTokenManager() {
 let cache:{key:string;token:string;expires:number}|undefined;
 let pending:{key:string;promise:Promise<string>}|undefined;
 const getToken=async function() {
  if(ebayConnectionMode()!=="oauth") {
   if(process.env.EBAY_ACCESS_TOKEN)return process.env.EBAY_ACCESS_TOKEN;
   throw new Error("eBay is not connected. Configure production EBAY_CLIENT_ID and EBAY_CLIENT_SECRET securely. Manual research remains available.");
  }
  const key=Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString("base64");
  if(cache?.key===key && cache.expires>Date.now())return cache.token;
  if(pending?.key===key)return pending.promise;
  const promise=(async()=>{
   configureProxyFromEnvironment();
   let response:Response;
   try{response=await fetch("https://api.ebay.com/identity/v1/oauth2/token",{method:"POST",headers:{Authorization:`Basic ${key}`,"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"client_credentials",scope:"https://api.ebay.com/oauth/api_scope"}),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(20000)});}catch{throw new Error("eBay authentication request could not complete. Try again later.");}
   if(response.status===429)throw new Error("eBay authentication rate limit reached. Wait before trying again.");
   if(!response.ok)throw new Error("eBay authentication failed. Check production App ID and Cert ID securely; sandbox keys do not work here.");
   let data:z.infer<typeof schema>;
   try{data=schema.parse(await response.json());}catch{throw new Error("eBay authentication response was invalid. No token was cached.");}
   cache={key,token:data.access_token,expires:Date.now()+(data.expires_in-60)*1000};
   return data.access_token;
  })();
  const current={key,promise};pending=current;
  try{return await promise;}finally{if(pending===current)pending=undefined;}
 };
 return Object.assign(getToken,{invalidate(token:string){if(cache?.token===token)cache=undefined;}});
}
export const getEbayToken=createEbayTokenManager();
