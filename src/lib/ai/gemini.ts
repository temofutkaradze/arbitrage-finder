import {aiFetch, aiResponseText, AI_REQUEST_TIMEOUT_MS, AiProviderError} from "./errors";
import { z } from "zod";
import { instructions, outputSchema, validateReport } from "./shared";
export async function generateGeminiReport(snapshot:unknown,ids:readonly string[],config:{key:string;model:string},fetcher:typeof fetch) {
 const signal=AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS);
 const response=await aiFetch(fetcher,`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,{
  method:"POST",redirect:"error",cache:"no-store",signal,
  headers:{"Content-Type":"application/json","x-goog-api-key":config.key},
  body:JSON.stringify({systemInstruction:{parts:[{text:instructions}]},contents:[{role:"user",parts:[{text:JSON.stringify(snapshot)}]}],
   generationConfig:{maxOutputTokens:2400,responseMimeType:"application/json",responseJsonSchema:outputSchema}}),
 });
 const raw=await aiResponseText(response,signal);if(raw.length>100_000)throw new Error("Response too large");
 const envelope=z.object({promptFeedback:z.object({blockReason:z.string().optional()}).optional(),candidates:z.array(z.object({finishReason:z.string(),content:z.object({parts:z.array(z.object({text:z.string().optional(),thought:z.boolean().optional()}))})})).length(1)}).parse(JSON.parse(raw));
 if(envelope.promptFeedback?.blockReason||envelope.candidates[0].finishReason!=="STOP")throw new AiProviderError("incomplete");
 const text=envelope.candidates[0].content.parts.filter(p=>!p.thought).map(p=>p.text??"").join("");
 return validateReport(JSON.parse(text),ids);
}
