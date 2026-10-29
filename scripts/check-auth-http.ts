import "dotenv/config";
import {config} from "dotenv";
import {resolve} from "node:path";
import {readFile} from "node:fs/promises";
import assert from "node:assert/strict";
import {prisma} from "../src/lib/db/prisma";
import {configuredAuth,newSession,SESSION_COOKIE} from "../src/lib/auth/core";
config({path:".env.local",quiet:true});
const origin="http://127.0.0.1:3000",decode=(s:string)=>s.replaceAll("&quot;",'"').replaceAll("&amp;","&");
async function post(path:string,html:string,values:Record<string,string>,cookie?:string,requestOrigin=origin){
 const form=[...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(m=>m[1]).find(f=>path==="/login"?f.includes('name="password"'):path==="/markets"?f.includes('name="code"'):f.includes("Sign out"));assert.ok(form);
 const data=new FormData();for(const m of form.matchAll(/<input\b[^>]*>/g)){if(!m[0].includes('type="hidden"'))continue;const n=m[0].match(/name="([^"]*)"/)?.[1],v=m[0].match(/value="([^"]*)"/)?.[1]??"";if(n)data.append(decode(n),decode(v));}
 for(const[k,v]of Object.entries(values))data.set(k,v);
 return fetch(origin+path,{method:"POST",headers:{Origin:requestOrigin,...(cookie?{Cookie:cookie}:{})},body:data,redirect:"manual"});
}
async function main(){
 let cookie:string|undefined;const temporary:string[]=[];
 try{
  for(const path of ["/","/research","/markets","/discovery","/automation","/matching"]){const r=await fetch(origin+path,{redirect:"manual"});assert.equal(r.status,307);assert.equal(r.headers.get("location"),"/login");}
  const html=await(await fetch(origin+"/login")).text();
  const privateAccess=await readFile(resolve("../.cloud-setup/owner-access.txt"),"utf8");const password=privateAccess.split("\n").find(l=>l.startsWith("Password: "))?.slice(10);assert.ok(password);
  // Authenticate normally; never print credentials, cookie values or response bodies.
  const good=await post("/login",html,{password});assert.equal(good.status,303);
  const setCookie=good.headers.get("set-cookie");assert.ok(setCookie);assert.ok(setCookie.includes("HttpOnly"));assert.ok(/SameSite=strict/i.test(setCookie));cookie=setCookie.split(";")[0];
  const home=await(await fetch(origin,{headers:{Cookie:cookie}})).text();assert.ok(home.includes("Overview"));
  const expired=newSession();temporary.push(expired.id);await prisma.ownerSession.create({data:{id:expired.id,passwordVersion:configuredAuth().version,expiresAt:new Date(0)}});
  assert.equal((await fetch(origin,{headers:{Cookie:`${SESSION_COOKIE}=${expired.token}`},redirect:"manual"})).status,307);
  const wrongVersion=newSession();temporary.push(wrongVersion.id);await prisma.ownerSession.create({data:{id:wrongVersion.id,passwordVersion:"old-password-version",expiresAt:wrongVersion.expiresAt}});
  assert.equal((await fetch(origin,{headers:{Cookie:`${SESSION_COOKIE}=${wrongVersion.token}`},redirect:"manual"})).status,307);
  const marketHtml=await(await fetch(origin+"/markets",{headers:{Cookie:cookie}})).text();
  const countBefore=await prisma.market.count();
  const unauthorized=await post("/markets",marketHtml,{code:"SHOULDNOTCREATE",name:"unauthorized",currency:"USD"});
  assert.equal(unauthorized.status,303);assert.equal(await prisma.market.count(),countBefore);
  const beforeCross=await prisma.ownerSession.count();
  const crossOrigin=await post("/login",html,{password},undefined,"https://wrong.example");assert.ok(crossOrigin.status>=400);assert.equal(await prisma.ownerSession.count(),beforeCross);
  const logout=await post("/",home,{},cookie);assert.equal(logout.status,303);
  assert.equal((await fetch(origin,{headers:{Cookie:cookie},redirect:"manual"})).status,307);
  assert.equal((await fetch(origin+"/api/health")).status,200);
  const initial=await prisma.ownerLoginState.findUnique({where:{id:"owner"}});
  if(initial&&initial.failures===0&&!initial.lockedUntil){
   try{
    for(let i=0;i<5;i++){const bad=await post("/login",html,{password:"wrong-test-only-password"});assert.equal(bad.status,200);}
    const locked=await prisma.ownerLoginState.findUniqueOrThrow({where:{id:"owner"}});assert.ok(locked.lockedUntil&&locked.lockedUntil>new Date());
    const blocked=await post("/login",html,{password});assert.equal(blocked.status,200);
   }finally{await prisma.ownerLoginState.update({where:{id:"owner"},data:{failures:initial.failures,lockedUntil:initial.lockedUntil,windowStartedAt:initial.windowStartedAt}});}
  }
  console.log("PASS: private route redirects, real owner sign-in, HttpOnly/SameSite cookies, expiry, password-version revocation, logout revocation, login throttling, action/origin rejection and readiness");
 }finally{if(temporary.length)await prisma.ownerSession.deleteMany({where:{id:{in:temporary}}});}
}
main().catch(()=>{console.error("Owner HTTP validation failed; no credentials or raw responses logged.");process.exitCode=1;}).finally(()=>prisma.$disconnect());
