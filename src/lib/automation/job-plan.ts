import {z} from "zod";
const id=z.number().int().positive().max(2147483647);
export const jobSteps=z.array(z.object({
 listingId:id,kind:z.enum(["supplier","shipping","competitors"]),reference:id.optional(),
 state:z.enum(["pending","running","done","blocked","failed"]).default("pending"),
 message:z.string().max(16000).default(""),
})).min(1).max(15);
export type JobStep=z.infer<typeof jobSteps>[number];
export function afterStep(steps:JobStep[],cursor:number,result:{ok:boolean;message:string},stopped:boolean){
 const next=steps.map(s=>({...s}));
 const step=next[cursor];
 if(!step||step.state!=="running")throw new Error("Invalid step transition");
 step.state=result.ok?"done":"failed";step.message=result.message.slice(0,16000);
 const state=stopped?"CANCELLED":!result.ok?"FAILED":cursor+1===steps.length?"SUCCEEDED":"QUEUED";
 return {steps:next,state,cursor:cursor+1};
}
