import { configureProxyFromEnvironment } from "../discovery/network";
import { generateOpenAiReport } from "./openai";
import { generateGeminiReport } from "./gemini";
export { reportSchema, validateReport } from "./shared";
export type AiConfig={provider:"openai"|"gemini";key:string;model:string};
export function aiConfigurationStatus() {
 const raw=process.env.AI_PROVIDER??"openai";
 const provider:AiConfig["provider"]|null=raw==="openai"||raw==="gemini"?raw:null;
 const legacy=process.env.AI_PROVIDER===undefined;
 const enabled=process.env.AI_RESEARCH_ENABLED??(legacy?process.env.OPENAI_RESEARCH_ENABLED:undefined);
 const key=provider==="gemini"?process.env.GEMINI_API_KEY:provider==="openai"?process.env.OPENAI_API_KEY:undefined;
 const model=process.env.AI_RESEARCH_MODEL??(provider==="gemini"?process.env.GEMINI_RESEARCH_MODEL:process.env.OPENAI_RESEARCH_MODEL);
 const validModel=!!model&&/^[a-zA-Z0-9._:-]{1,100}$/.test(model);
 const checks=[
  {id:"provider",ok:provider!==null,label:"AI_PROVIDER",help:"აირჩიე gemini ან openai. გამოტოვებისას გამოიყენება ძველი OpenAI კონფიგურაცია."},
  {id:"enabled",ok:enabled==="true",label:"AI_RESEARCH_ENABLED",help:"ჩაწერე true, შემდეგ ხელახლა გაუშვი აპი."},
  {id:"model",ok:validModel,label:"AI_RESEARCH_MODEL",help:model?.startsWith("models/")?"მოდელის ID-დან წაშალე საწყისი models/. ზუსტი ხელმისაწვდომობა პროვაიდერთან გადაამოწმე.":"ჩაწერე ზუსტი მოდელის ID, models/ პრეფიქსისა და ზედმეტი გამოტოვებების გარეშე."},
  {id:"key",ok:!!key?.trim(),label:provider==="gemini"?"GEMINI_API_KEY":provider==="openai"?"OPENAI_API_KEY":"API key",help:"გასაღები დაამატე მხოლოდ სერვერის .env.local-ში. პროვაიდერი ჯერ აირჩიე; გასაღები ჩატში არ გამოგზავნო."},
 ];
 return {ready:checks.every(c=>c.ok),provider,model:validModel?model!:null,checks};
}
export function aiConfig():AiConfig|null {
 const status=aiConfigurationStatus();
 if(!status.ready||!status.provider||!status.model)return null;
 const key=status.provider==="gemini"?process.env.GEMINI_API_KEY!:process.env.OPENAI_API_KEY!;
 return {provider:status.provider,key,model:status.model};
}
export async function generateReport(snapshot:unknown,ids:readonly string[],config:AiConfig,fetcher:typeof fetch=fetch) {
 if(fetcher===fetch)configureProxyFromEnvironment();
 const adapter=config.provider==="gemini"?generateGeminiReport:generateOpenAiReport;
 return adapter(snapshot,ids,config,fetcher);
}
