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
 expect(await generateReport({sources:[]},["product:1"],{key:"dummy",model:"test"},fetcher)).toEqual(report);
 expect(fetcher).toHaveBeenCalledTimes(1);
 const [url,init]=fetcher.mock.calls[0];expect(url).toBe("https://api.openai.com/v1/responses");
 const body=JSON.parse(String(init?.body));expect(body.store).toBe(false);expect(body.max_output_tokens).toBe(2400);expect(body.tools).toBeUndefined();
});
it("does not retry rejected, incomplete or malformed provider output",async()=>{
 for(const response of [new Response("secret upstream error",{status:401}),new Response(JSON.stringify({status:"incomplete",output:[]})),new Response("bad json")]){
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(response);
  await expect(generateReport({},[],{key:"dummy",model:"test"},fetcher)).rejects.toThrow();expect(fetcher).toHaveBeenCalledTimes(1);
 }
});
