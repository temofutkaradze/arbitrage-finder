import {afterEach,expect,it,vi} from "vitest";
import {aiFetch,aiResponseText,AI_REQUEST_TIMEOUT_MS,aiRequestTimeoutMs} from "./errors";
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

afterEach(()=>vi.unstubAllEnvs());
it("permits a five-minute configured deadline but rejects unbounded or malformed settings",()=>{
 vi.stubEnv("AI_REQUEST_TIMEOUT_SECONDS","300");expect(aiRequestTimeoutMs()).toBe(300000);
 for(const value of ["301","0","-1","Infinity","300.5","bad"]){vi.stubEnv("AI_REQUEST_TIMEOUT_SECONDS",value);expect(aiRequestTimeoutMs()).toBe(120000);}
});
