import { configureProxyFromEnvironment } from "../discovery/network";
import { generateOpenAiReport } from "./openai";
import { generateGeminiReport } from "./gemini";
export { reportSchema, validateReport } from "./shared";
export type AiConfig={provider:"openai"|"gemini";key:string;model:string};
export function aiConfig():AiConfig|null {
 const provider=process.env.AI_PROVIDER??"openai";
 if(provider!=="openai"&&provider!=="gemini")return null;
 const legacy=process.env.AI_PROVIDER===undefined;
 const enabled=process.env.AI_RESEARCH_ENABLED??(legacy?process.env.OPENAI_RESEARCH_ENABLED:undefined);
 const key=provider==="gemini"?process.env.GEMINI_API_KEY:process.env.OPENAI_API_KEY;
 const model=process.env.AI_RESEARCH_MODEL??(provider==="gemini"?process.env.GEMINI_RESEARCH_MODEL:process.env.OPENAI_RESEARCH_MODEL);
 if(enabled!=="true"||!key?.trim()||!model||!/^[a-zA-Z0-9._:-]{1,100}$/.test(model))return null;
 return {provider,key,model};
}
export async function generateReport(snapshot:unknown,ids:readonly string[],config:AiConfig,fetcher:typeof fetch=fetch) {
 if(fetcher===fetch)configureProxyFromEnvironment();
 const adapter=config.provider==="gemini"?generateGeminiReport:generateOpenAiReport;
 return adapter(snapshot,ids,config,fetcher);
}
