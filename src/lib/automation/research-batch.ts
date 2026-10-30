import {z} from "zod";
export const batchIds=z.array(z.number().int().positive().max(2147483647)).min(1).max(3).refine(ids=>new Set(ids).size===ids.length,"Duplicate candidates");
type Start={ok:boolean;message:string;changes:string[];routes:{quoteId:number;label:string}[]};
export type BatchEvent={id:number;stage:"supplier"|"shipping"|"competitors";state:"running"|"done"|"blocked"|"failed";message:string;href?:string};
export async function runResearchBatch(ids:number[],ops:{start:(id:number)=>Promise<Start>;route:(id:number,quoteId:number)=>Promise<{ok:boolean;message:string}>;wait:()=>Promise<boolean>;event:(e:BatchEvent)=>void;competitors?:(id:number)=>Promise<{state:"done"|"blocked"|"failed";attempted:boolean;message:string;href?:string}>;waitCompetitors?:()=>Promise<boolean>},signal:AbortSignal){
 batchIds.parse(ids);
 let needsWait=false,offersAttempted=false,offersFailed=false;
 for(const id of ids){
  if(signal.aborted)return "stopped";
  if(needsWait&&!await ops.wait())return "stopped";
  if(signal.aborted)return "stopped";
  ops.event({id,stage:"supplier",state:"running",message:"ვარიანტები და მარაგი მოწმდება…"});
  const result=await ops.start(id);needsWait=true;
  ops.event({id,stage:"supplier",state:result.ok?"done":"failed",message:[result.message,...result.changes].join("\n")});
  if(signal.aborted)return "stopped";
  if(!result.ok)return "failed";
  if(result.routes.length>3)throw new Error("Route bound exceeded");
  if(!result.routes.length)ops.event({id,stage:"shipping",state:"blocked",message:"შენახული მარშრუტი არ არის. ვარიანტის გვერდზე აირჩიე ბაზარი, საწყობი და ZIP; მიწოდება უცნობია."});
  for(const route of result.routes){
   if(signal.aborted||!await ops.wait()||signal.aborted)return "stopped";
   ops.event({id,stage:"shipping",state:"running",message:route.label});
   const updated=await ops.route(id,route.quoteId);
   ops.event({id,stage:"shipping",state:updated.ok?"done":"failed",message:updated.message});
   if(signal.aborted)return "stopped";
   if(!updated.ok)return "failed";
  }
  if(ops.competitors){
   if(signal.aborted)return "stopped";
   if(offersFailed){ops.event({id,stage:"competitors",state:"blocked",message:"eBay-ის წინა შეცდომის შემდეგ დარჩენილი ძიება გამოტოვებულია; CJ პროცესი გრძელდება."});continue;}
   if(offersAttempted){if(!ops.waitCompetitors)throw new Error("Competitor pacing missing");if(!await ops.waitCompetitors()||signal.aborted)return "stopped";}
   ops.event({id,stage:"competitors",state:"running",message:"eBay წვდომა და არჩეული ბაზარი მოწმდება…"});
   const offers=await ops.competitors(id);offersAttempted=offersAttempted||offers.attempted;offersFailed=offers.state==="failed";
   ops.event({id,stage:"competitors",...offers});
   if(signal.aborted)return "stopped";
  }

 }
 return "finished";
}
export function waitForCj(signal:AbortSignal,tick:(n:number)=>void,duration=31){
 return new Promise<boolean>(resolve=>{
  if(signal.aborted){resolve(false);return;}
  let seconds=duration;tick(seconds);
  const finish=(ok:boolean)=>{clearInterval(timer);signal.removeEventListener("abort",stop);tick(0);resolve(ok);};
  const stop=()=>finish(false);
  const timer=setInterval(()=>{seconds--;tick(seconds);if(seconds===0)finish(true);},1000);
  signal.addEventListener("abort",stop,{once:true});
 });
}
