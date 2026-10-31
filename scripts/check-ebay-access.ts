import {loadEnvConfig} from "@next/env";
import {configureProxyFromEnvironment} from "../src/lib/discovery/network";

async function main(){
 const inherited={clientId:!!process.env.EBAY_CLIENT_ID,clientSecret:!!process.env.EBAY_CLIENT_SECRET};
 const loaded=loadEnvConfig(process.cwd(),true);
 const id=process.env.EBAY_CLIENT_ID,secret=process.env.EBAY_CLIENT_SECRET;
 const keys=["EBAY_CLIENT_ID","EBAY_CLIENT_SECRET"];
 console.log(JSON.stringify({node:process.versions.node,loadedEnvFiles:loaded.loadedEnvFiles.map(f=>f.path),inheritedCredentialsPresent:inherited,clientIdPresent:!!id,clientSecretPresent:!!secret,productionIdFormat:!!id?.includes("-PRD-"),surroundingWhitespace:!!(id&&id!==id.trim()||secret&&secret!==secret.trim()),duplicateKeys:loaded.loadedEnvFiles.map(f=>({file:f.path,keys:keys.filter(k=>f.contents.split(/\r?\n/).filter(line=>new RegExp(`^\\s*(?:export\\s+)?${k}\\s*=`).test(line)).length>1)}))}));
 if(!id||!secret){process.exitCode=1;return;}
 configureProxyFromEnvironment();
 try{
  const response=await fetch("https://api.ebay.com/identity/v1/oauth2/token",{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"client_credentials",scope:"https://api.ebay.com/oauth/api_scope"}),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(20000)});
  const payload=await response.json().catch(()=>null);
  const knownErrors=new Set(["invalid_client","unauthorized_client","invalid_grant","invalid_scope","unsupported_grant_type","server_error","temporarily_unavailable"]);
  console.log(JSON.stringify({stage:"production-oauth",http:response.status,tokenReceived:!!(response.ok&&typeof payload?.access_token==="string"),oauthError:knownErrors.has(payload?.error)?payload.error:null}));
  if(!response.ok||typeof payload?.access_token!=="string")process.exitCode=1;
 }catch{console.log(JSON.stringify({stage:"production-oauth",outcome:"network_timeout_or_response_error"}));process.exitCode=1;}
}
main().catch(()=>{console.error("Configuration check failed. Run from the project folder. No credential values logged.");process.exitCode=1;});
