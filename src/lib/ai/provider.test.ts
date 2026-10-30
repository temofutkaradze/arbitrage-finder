import { afterEach, expect, it, vi } from "vitest";
import { aiConfig, generateReport, validateReport } from "./provider";
const report={findings:[{kind:"unknown",text:"Demand is unknown.",sourceIds:["product:1"]}]};
afterEach(()=>vi.unstubAllEnvs());
it("is disabled unless all server-only configuration is present",()=>{
 vi.stubEnv("OPENAI_RESEARCH_ENABLED","false");vi.stubEnv("OPENAI_API_KEY","dummy");vi.stubEnv("OPENAI_RESEARCH_MODEL","gpt-4.1-mini");expect(aiConfig()).toBeNull();
 vi.stubEnv("OPENAI_RESEARCH_ENABLED","true");expect(aiConfig()?.model).toBe("gpt-4.1-mini");
});
it("rejects invented citations, empty citations, invalid output kinds and empty reports",()=>{
 expect(()=>validateReport(report,["product:2"])).toThrow();
 expect(()=>validateReport({findings:[{...report.findings[0],sourceIds:[]}]},["product:1"])).toThrow();
 expect(()=>validateReport({findings:[]},["product:1"])).toThrow();
 expect(validateReport(report,["product:1"])).toEqual(report);
});
it("sends a single bounded request, without tools, stored responses or arbitrary endpoints",async()=>{
 const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({status:"completed",output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(report)}]}]})));
 expect(await generateReport({sources:[]},["product:1"],{provider:"openai",key:"dummy",model:"test"},fetcher)).toEqual(report);
 expect(fetcher).toHaveBeenCalledTimes(1);
 const [url,init]=fetcher.mock.calls[0];expect(url).toBe("https://api.openai.com/v1/responses");
 const body=JSON.parse(String(init?.body));expect(body.store).toBe(false);expect(body.max_output_tokens).toBe(2400);expect(body.tools).toBeUndefined();
});
it("does not retry rejected, incomplete or malformed provider output",async()=>{
 for(const response of [new Response("secret upstream error",{status:401}),new Response(JSON.stringify({status:"incomplete",output:[]})),new Response("bad json")]){
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(response);
  await expect(generateReport({},[],{provider:"openai",key:"dummy",model:"test"},fetcher)).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(1);
 }
});
it("selects only the configured provider and fails closed without its key",()=>{
 vi.stubEnv("AI_PROVIDER","gemini");vi.stubEnv("AI_RESEARCH_ENABLED","true");vi.stubEnv("AI_RESEARCH_MODEL","gemini-test");vi.stubEnv("GEMINI_API_KEY","gemini-dummy");vi.stubEnv("OPENAI_API_KEY","openai-dummy");
 expect(aiConfig()).toEqual({provider:"gemini",model:"gemini-test",key:"gemini-dummy"});
 vi.stubEnv("GEMINI_API_KEY","");expect(aiConfig()).toBeNull();
 vi.stubEnv("AI_PROVIDER","openai");expect(aiConfig()?.key).toBe("openai-dummy");
 vi.stubEnv("AI_PROVIDER","unsupported");expect(aiConfig()).toBeNull();
});
it("Gemini uses header auth and the same validated report contract",async()=>{
 const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify(report)}]}}]})));
 expect(await generateReport({},["product:1"],{provider:"gemini",key:"dummy-secret",model:"gemini-test"},fetcher)).toEqual(report);
 const [url,init]=fetcher.mock.calls[0];expect(String(url)).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent");expect(String(url)).not.toContain("dummy-secret");
 expect(new Headers(init?.headers).get("x-goog-api-key")).toBe("dummy-secret");expect(new Headers(init?.headers).has("Authorization")).toBe(false);
 const body=JSON.parse(String(init?.body));expect(body.generationConfig.maxOutputTokens).toBe(2400);expect(body.generationConfig.responseMimeType).toBe("application/json");expect(body.tools).toBeUndefined();expect(fetcher).toHaveBeenCalledTimes(1);
});
it("rejects blocked, truncated, invented-citation and malformed Gemini output without fallback",async()=>{
 for(const value of [{promptFeedback:{blockReason:"SAFETY"}}, {candidates:[{finishReason:"MAX_TOKENS",content:{parts:[{text:JSON.stringify(report)}]}}]}, {candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify({findings:[{...report.findings[0],sourceIds:["invented"]}]})}]}}]}, {candidates:[{finishReason:"STOP",content:{parts:[{text:"bad json"}]}}]}]){
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(value)));
  await expect(generateReport({},["product:1"],{provider:"gemini",key:"dummy",model:"test"},fetcher)).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(1);
 }
});
