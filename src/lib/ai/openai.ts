import {aiFetch, aiResponseText, AI_REQUEST_TIMEOUT_MS, AiProviderError} from "./errors";
import { z } from "zod";
import { instructions, outputSchema, validateReport } from "./shared";
export async function generateOpenAiReport(snapshot:unknown,ids:readonly string[],config:{key:string;model:string},fetcher:typeof fetch=fetch) {
 const signal=AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS);
 const response=await aiFetch(fetcher,"https://api.openai.com/v1/responses",{
  method:"POST",redirect:"error",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:`Bearer ${config.key}`},signal,
  body:JSON.stringify({model:config.model,store:false,max_output_tokens:2400,
   instructions,
   input:JSON.stringify(snapshot),
   text:{format:{type:"json_schema",name:"product_research",strict:true,schema:outputSchema}},
  }),
 });
 const raw=await aiResponseText(response,signal);if(raw.length>100_000)throw new Error("Response too large");
 const envelope=z.object({status:z.literal("completed"),output:z.array(z.object({type:z.string(),content:z.array(z.object({type:z.string(),text:z.string().optional()})).optional()}))}).parse(JSON.parse(raw));
 const output=envelope.output.filter(o=>o.type==="message").flatMap(o=>o.content??[]);
 if(output.some(o=>o.type==="refusal"))throw new AiProviderError("incomplete");
 const text=output.filter(c=>c.type==="output_text").map(c=>c.text??"").join("");
 return validateReport(JSON.parse(text),ids);
}
