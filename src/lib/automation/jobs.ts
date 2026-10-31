import {randomUUID} from "node:crypto";
import {z} from "zod";
import {prisma} from "../db/prisma";
import {batchIds} from "./research-batch";
import {savedRefreshRoutes} from "../sourcing/refresh-plan";
import {afterStep,jobSteps,type JobStep} from "./job-plan";
const request=z.object({id:z.string().uuid(),ids:batchIds,confirmed:z.literal(true),marketId:z.number().int().positive().max(2147483647).optional()});
export function jobsEnabled(){return process.env.RESEARCH_JOBS_ENABLED==="true";}
function enabled(){if(!jobsEnabled())throw new Error("Background research is not enabled.");}
export async function enqueueResearch(input:unknown){
 enabled();const data=request.parse(input);
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340925)`;
  const old=await tx.researchJob.findUnique({where:{id:data.id}});if(old)return old.id;
  if(await tx.researchJob.count({where:{state:{in:["QUEUED","RUNNING"]}}}))throw new Error("A research job is already active.");
  const steps:JobStep[]=[];
  for(const listingId of data.ids){
   const listing=await tx.sourceListing.findUnique({where:{id:listingId}});
   if(!listing?.opportunityId||listing.provider!=="cj"||listing.importedVia!=="CJ_API")throw new Error("Select saved CJ candidates.");
   steps.push({listingId,kind:"supplier",state:"pending",message:""});
   const quotes=await tx.shippingQuote.findMany({where:{variant:{listingId}},include:{market:true},orderBy:{id:"desc"},take:100});
   for(const route of savedRefreshRoutes(quotes).routes)steps.push({listingId,kind:"shipping",reference:route.quoteId,state:"pending",message:""});
   if(data.marketId){
    if(!await tx.evaluation.findUnique({where:{opportunityId_marketId:{opportunityId:listing.opportunityId,marketId:data.marketId}}}))throw new Error("Selected market needs an evaluation.");
    steps.push({listingId,kind:"competitors",reference:data.marketId,state:"pending",message:""});
   }
  }
  await tx.researchJob.create({data:{id:data.id,steps:jobSteps.parse(steps)}});return data.id;
 });
}
export async function stopResearch(id:string){
 enabled();z.string().uuid().parse(id);
 await prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340925)`;
  const job=await tx.researchJob.findUniqueOrThrow({where:{id}});
  if(job.state==="QUEUED")await tx.researchJob.update({where:{id},data:{state:"CANCELLED",stopRequested:true,finishedAt:new Date()}});
  else if(job.state==="RUNNING")await tx.researchJob.update({where:{id},data:{stopRequested:true}});
 });
}
export async function claimResearch(now=new Date()){
 enabled();return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340925)`;
  // An interrupted call may have reached the provider. Never replay it automatically.
  await tx.researchJob.updateMany({where:{state:"RUNNING",leaseUntil:{lte:now}},data:{state:"INTERRUPTED",leaseToken:null,leaseUntil:null,finishedAt:now}});
  if(await tx.researchJob.count({where:{state:"RUNNING"}}))return null;
  const job=await tx.researchJob.findFirst({where:{state:"QUEUED",stopRequested:false,nextRunAt:{lte:now}},orderBy:{createdAt:"asc"}});
  if(!job)return null;
  const steps=jobSteps.parse(job.steps);const step=steps[job.cursor];
  if(!step||step.state!=="pending")throw new Error("Invalid stored job state.");
  step.state="running";
  return tx.researchJob.update({where:{id:job.id},data:{state:"RUNNING",steps,leaseToken:randomUUID(),leaseUntil:new Date(now.getTime()+600_000)}});
 });
}
export async function finishResearch(id:string,token:string,result:{ok:boolean;message:string},now=new Date()){
 return prisma.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340925)`;
  const job=await tx.researchJob.findUniqueOrThrow({where:{id}});
  if(job.state!=="RUNNING"||job.leaseToken!==token||!job.leaseUntil||job.leaseUntil<=now)return false;
  const next=afterStep(jobSteps.parse(job.steps),job.cursor,result,job.stopRequested);
  await tx.researchJob.update({where:{id},data:{...next,leaseToken:null,leaseUntil:null,nextRunAt:new Date(now.getTime()+61_000),finishedAt:next.state==="QUEUED"?null:now}});
  return true;
 });
}
