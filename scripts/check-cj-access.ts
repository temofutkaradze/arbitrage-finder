import {loadEnvConfig} from "@next/env";
import {configureProxyFromEnvironment} from "../src/lib/discovery/network";
const inheritedCredentialPresent=!!process.env.CJ_ACCESS_TOKEN;
const loaded=loadEnvConfig(process.cwd(),true,{info:()=>{},error:()=>{}});
const base="https://developers.cjdropshipping.com/api2.0/v1";
async function request(path:string,init:RequestInit){
 const r=await fetch(base+path,{...init,redirect:"error",signal:AbortSignal.timeout(20000)});
 let body:Record<string,unknown>={};try{body=await r.json();}catch{}
 return {r,body};
}
function report(stage:string,r:Response,body:Record<string,unknown>){
 console.log(JSON.stringify({stage,http:r.status,cjCode:typeof body.code==="number"?body.code:null,result:body.result===true||body.success===true}));
}
async function main(){
 const credential=process.env.CJ_ACCESS_TOKEN;
 console.log(JSON.stringify({systemTimeUtc:new Date().toISOString(),credentialPresent:!!credential,inheritedCredentialPresent,loadedEnvFiles:loaded.loadedEnvFiles.map(f=>f.path)}));
 if(!credential)return;
 configureProxyFromEnvironment();
 const direct=await request("/product/listV2?page=1&size=1&keyWord=organizer",{headers:{"CJ-Access-Token":credential}});report("catalogue-direct",direct.r,direct.body);
 if(direct.r.ok&&direct.body.code===200&&(direct.body.result||direct.body.success))return;
 if(direct.r.status!==401&&direct.body.code!==1600001)return;
 await new Promise(resolve=>setTimeout(resolve,1100));
 const exchange=await request("/authentication/getAccessToken",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey:credential})});report("api-key-exchange",exchange.r,exchange.body);
 const data=exchange.body.data as {accessToken?:unknown}|undefined;
 if(exchange.r.ok&&exchange.body.code===200&&typeof data?.accessToken==="string"){
  await new Promise(resolve=>setTimeout(resolve,1100));
  const retry=await request("/product/listV2?page=1&size=1&keyWord=organizer",{headers:{"CJ-Access-Token":data.accessToken}});report("catalogue-after-exchange",retry.r,retry.body);
 }
}
main().catch(()=>{console.error("CJ transport check failed. Check Internet access, TLS trust and Node.js 24. No credentials or response bodies were printed.");process.exitCode=1;});
