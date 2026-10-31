import "dotenv/config";
import {config} from "dotenv";
config({path:".env.local",quiet:true});
import {setTimeout} from "node:timers/promises";
import {prisma} from "../src/lib/db/prisma";
import {claimResearch,finishResearch,jobsEnabled} from "../src/lib/automation/jobs";
import {jobSteps} from "../src/lib/automation/job-plan";
import {startProductRefresh,refreshSavedRoute} from "../src/lib/sourcing/refresh-service";
import {collectBatchOffers} from "../src/lib/automation/batch-offers";
const stop=new AbortController();
process.once("SIGINT",()=>stop.abort());process.once("SIGTERM",()=>stop.abort());
async function main(){
 const args=process.argv.slice(2);
 if(args.some(a=>!["--once","--dry-run"].includes(a)))throw new Error("Unsupported option");
 if(!jobsEnabled())throw new Error("Background research is disabled");
 if(args.includes("--dry-run")){console.log(JSON.stringify(await prisma.researchJob.findMany({where:{state:{in:["QUEUED","RUNNING"]}},select:{id:true,state:true,cursor:true,nextRunAt:true},take:20})));return;}
 do{
  const job=await claimResearch();
  if(job){
   const step=jobSteps.parse(job.steps)[job.cursor];
   let result:{ok:boolean;message:string};
   try{
    if(step.kind==="supplier")result=await startProductRefresh(step.listingId);
    else if(step.kind==="shipping")result=await refreshSavedRoute(step.listingId,step.reference!);
    else {const offer=await collectBatchOffers(step.listingId,step.reference!);result={ok:offer.state==="done",message:offer.message};}
   }catch{result={ok:false,message:"Request outcome could not be confirmed. Review saved data before another attempt."};}
   const saved=await finishResearch(job.id,job.leaseToken!,result);
   console.log(JSON.stringify({job:job.id,step:job.cursor,checkpointSaved:saved}));
  }
  if(args.includes("--once"))break;
  await setTimeout(5000,undefined,{signal:stop.signal}).catch(()=>{});
 }while(!stop.signal.aborted);
}
main().catch(()=>{console.error("Research worker stopped. Check configuration and database readiness; no automatic retry of an uncertain step.");process.exitCode=1;}).finally(()=>prisma.$disconnect());
