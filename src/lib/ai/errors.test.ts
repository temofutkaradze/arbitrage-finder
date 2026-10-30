import {expect,it,vi} from "vitest";
import {aiFetch,aiResponseText,AI_REQUEST_TIMEOUT_MS} from "./errors";
it("allows a bounded two-minute response and distinguishes network from deadline failure",async()=>{
 expect(AI_REQUEST_TIMEOUT_MS).toBe(120000);
 const signal=AbortSignal.abort(new DOMException("private timeout detail","TimeoutError"));
 const failing=vi.fn<typeof fetch>().mockRejectedValue(new TypeError("private transport detail"));
 await expect(aiFetch(failing,"https://example.com",{signal})).rejects.toMatchObject({code:"timeout"});
 await expect(aiFetch(failing,"https://example.com",{})).rejects.toMatchObject({code:"network"});
});
it("also identifies deadlines while consuming the response body",async()=>{
 const signal=AbortSignal.abort(new DOMException("private detail","TimeoutError"));
 const response=new Response(new ReadableStream({start(controller){controller.error(new Error("private body detail"));}}));
 await expect(aiResponseText(response,signal)).rejects.toMatchObject({code:"timeout"});
});
