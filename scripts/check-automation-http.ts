import {authenticatedFetch as fetch,cleanupTestSessions} from "./test-auth";
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db/prisma";
const origin="http://127.0.0.1:3000";
const decode=(s:string)=>s.replaceAll("&quot;",'"').replaceAll("&amp;","&");
const forms=(s:string)=>[...s.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(m=>m[1]);
async function submit(form:string,values:Record<string,string>){
 const data=new FormData();
 for(const m of form.matchAll(/<input\b[^>]*>/g)){
  if(!m[0].includes('type="hidden"'))continue;
  const n=m[0].match(/name="([^"]*)"/)?.[1],v=m[0].match(/value="([^"]*)"/)?.[1]??"";
  if(n)data.append(decode(n),decode(v));
 }
 for(const[k,v]of Object.entries(values))data.set(k,v);
 const r=await fetch(origin+"/automation",{method:"POST",headers:{Origin:origin},body:data});assert.equal(r.status,200);return r.text();
}
async function main(){
 // Stop workers before this test: enabling is tested but no provider calls should run.
 const keyword=`test-http-${randomUUID()}`;
 try{
  const r=await fetch(origin+"/automation");assert.equal(r.status,200);let html=await r.text();
  const form=forms(html).find(f=>f.includes('name="keyword"'));assert.ok(form);
  let result=await submit(form,{keyword,intervalHours:"1"});assert.ok(result.includes("Not saved."));
  result=await submit(form,{keyword,intervalHours:"24"});assert.ok(result.includes("Schedule created paused"));
  const job=await prisma.discoverySchedule.findUniqueOrThrow({where:{keyword}});assert.equal(job.enabled,false);
  html=await(await fetch(origin+"/automation")).text();
  const toggle=forms(html).find(f=>f.includes(`name="id" value="${job.id}"`));assert.ok(toggle);
  result=await submit(toggle,{});assert.ok(result.includes("Confirm that"));
  assert.equal((await prisma.discoverySchedule.findUniqueOrThrow({where:{id:job.id}})).enabled,false);
  result=await submit(toggle,{confirmed:"on"});assert.ok(result.includes("Enabled."));
  assert.equal((await prisma.discoverySchedule.findUniqueOrThrow({where:{id:job.id}})).enabled,true);
  html=await(await fetch(origin+"/automation")).text();
  const pause=forms(html).find(f=>f.includes(`name="id" value="${job.id}"`));assert.ok(pause);
  result=await submit(pause,{});assert.ok(result.includes("Paused."));
  assert.equal((await prisma.discoverySchedule.findUniqueOrThrow({where:{id:job.id}})).enabled,false);
  assert.equal(await prisma.discoveryExecution.count({where:{scheduleId:job.id}}),0);
  console.log("PASS: schedule form validation, paused defaults, explicit enable confirmation and pause; no provider requests");
 }finally{await prisma.discoverySchedule.deleteMany({where:{keyword}});}
}
main().catch(e=>{console.error(e instanceof Error?e.message:"Automation HTTP check failed");process.exitCode=1;}).finally(async()=>{await cleanupTestSessions();await prisma.$disconnect();});
