import {expect,it} from "vitest";
import {afterStep,jobSteps,type JobStep} from "./job-plan";
const steps:JobStep[]=[{listingId:1,kind:"supplier",state:"running",message:""},{listingId:1,kind:"shipping",reference:2,state:"pending",message:""}];
it("checkpoints successful steps without mutating prior history",()=>{
 const r=afterStep(steps,0,{ok:true,message:"saved"},false);
 expect(r.state).toBe("QUEUED");expect(r.cursor).toBe(1);expect(r.steps[0].state).toBe("done");expect(steps[0].state).toBe("running");
});
it("stops after failures and honors cancellation after an in-flight success",()=>{
 expect(afterStep(steps,0,{ok:false,message:"failed"},false).state).toBe("FAILED");
 expect(afterStep(steps,0,{ok:true,message:"saved"},true).state).toBe("CANCELLED");
 expect(afterStep([steps[0]],0,{ok:true,message:"saved"},false).state).toBe("SUCCEEDED");
});
it("rejects replay of a completed step and bounds serialized history",()=>{
 expect(()=>afterStep([{...steps[0],state:"done"}],0,{ok:true,message:"again"},false)).toThrow();
 expect(jobSteps.safeParse(Array(16).fill(steps[0])).success).toBe(false);
 expect(afterStep(steps,0,{ok:false,message:"a".repeat(20000)},false).steps[0].message).toHaveLength(16000);
});
