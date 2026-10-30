import {expect,it,vi} from "vitest";
import {batchIds,runResearchBatch,waitForCj,type BatchEvent} from "./research-batch";
it("rejects duplicates, empty selections and more than three before provider work",()=>{for(const ids of [[],[1,1],[1,2,3,4],[-1]])expect(()=>batchIds.parse(ids)).toThrow();});
it("serializes supplier and routes, waits between operations and reports missing routes",async()=>{
 const calls:string[]=[],events:BatchEvent[]=[];
 const state=await runResearchBatch([1,2],{start:async id=>{calls.push('start'+id);return {ok:true,message:"ok",changes:[],routes:id===1?[{quoteId:9,label:"US"}]:[]};},route:async()=>{calls.push('route');return {ok:true,message:"ok"};},wait:async()=>{calls.push('wait');return true;},event:e=>events.push(e)},new AbortController().signal);
 expect(calls).toEqual(['start1','wait','route','wait','start2']);expect(state).toBe('finished');expect(events.at(-1)?.state).toBe('blocked');
});
it("stops on failure and prevents follow-ups after stopping an in-flight request",async()=>{
 const route=vi.fn(),start=vi.fn().mockResolvedValue({ok:false,message:"rejected",changes:[],routes:[]});
 const ops={start,route,wait:async()=>true,event:()=>{}};
 expect(await runResearchBatch([1,2],ops,new AbortController().signal)).toBe('failed');expect(start).toHaveBeenCalledTimes(1);expect(route).not.toHaveBeenCalled();
 const cancel=new AbortController();start.mockImplementation(async()=>{cancel.abort();return {ok:true,message:"saved",changes:[],routes:[{quoteId:1,label:"route"}]};});
 expect(await runResearchBatch([1,2],ops,cancel.signal)).toBe('stopped');expect(route).not.toHaveBeenCalled();
});
it("cancels cooldown promptly without scheduling another operation",async()=>{
 vi.useFakeTimers();try{const cancel=new AbortController(),tick=vi.fn();const pending=waitForCj(cancel.signal,tick);cancel.abort();expect(await pending).toBe(false);expect(vi.getTimerCount()).toBe(0);}finally{vi.useRealTimers();}
});
it("collects optional offers with separate pacing; blocked access does not stop CJ",async()=>{
 const events:BatchEvent[]=[],calls:string[]=[];let n=0;
 const state=await runResearchBatch([1,2,3],{start:async id=>{calls.push('cj'+id);return {ok:true,message:'ok',changes:[],routes:[]};},route:async()=>({ok:true,message:'ok'}),wait:async()=>true,event:e=>events.push(e),waitCompetitors:async()=>{calls.push('ebay-wait');return true;},competitors:async()=>{n++;return n===1?{state:'done',attempted:true,message:'pending'}:{state:'blocked',attempted:false,message:'no evaluation'};}},new AbortController().signal);
 expect(state).toBe('finished');expect(calls).toEqual(['cj1','cj2','ebay-wait','cj3','ebay-wait']);expect(events.filter(e=>e.stage==='competitors'&&e.state==='blocked')).toHaveLength(2);
});
it("does not repeat eBay failures for remaining candidates but continues CJ",async()=>{
 const offers=vi.fn().mockResolvedValue({state:'failed',attempted:true,message:'denied'}),start=vi.fn().mockResolvedValue({ok:true,message:'ok',changes:[],routes:[]});
 await runResearchBatch([1,2],{start,route:vi.fn(),wait:async()=>true,event:()=>{},competitors:offers},new AbortController().signal);
 expect(offers).toHaveBeenCalledTimes(1);expect(start).toHaveBeenCalledTimes(2);
});
