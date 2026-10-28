import { prisma } from "../db/prisma";
import { configureProxyFromEnvironment } from "../discovery/network";
import { NBG_URL, georgiaDay, normalizeNbg } from "./reference";
export async function refreshReferenceRates() {
  await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340925)`;
    const last=await tx.importRun.findFirst({where:{source:"fx-attempt"},orderBy:{completedAt:"desc"}});
    if(last&&Date.now()-last.completedAt.getTime()<600000)throw new Error("FX wait ten minutes between refresh attempts; existing snapshots remain available.");
    await tx.importRun.create({data:{source:"fx-attempt",created:0,updated:0,unchanged:0}});
  });
  configureProxyFromEnvironment();
  let payload:unknown;
  try{
    const response=await fetch(`${NBG_URL}?date=${georgiaDay()}`,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error("upstream status");
    const text=await response.text();if(text.length>500000)throw new Error("oversize");payload=JSON.parse(text);
  }catch{throw new Error("FX official source unavailable; retain existing snapshots or use a documented manual rate.");}
  let rows;try{rows=normalizeNbg(payload);}catch{throw new Error("FX source data is missing, stale, future-effective or invalid; no rates saved.");}
  await prisma.$transaction(async tx=>{
    for(const row of rows)await tx.fxSnapshot.upsert({where:{provider_currency_rateDate_rate:{provider:row.provider,currency:row.currency,rateDate:row.rateDate,rate:row.rate}},create:row,update:{}});
  });
  return rows.length;
}
