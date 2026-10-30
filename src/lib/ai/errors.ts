export const aiFailures={
 auth:"API გასაღები არ იქნა მიღებული (HTTP 401). გადაამოწმე არჩეული პროვაიდერის გასაღები.",
 access:"წვდომა უარყოფილია (HTTP 403). გადაამოწმე პროექტის API წვდომა და ანგარიშის შეზღუდვები.",
 model:"მოდელი ან API მისამართი ვერ მოიძებნა (HTTP 404). გადაამოწმე მოდელის ზუსტი ID და მისი ხელმისაწვდომობა შენი გასაღებისთვის.",
 quota:"პროვაიდერმა დააბრუნა HTTP 429. ეს შეიძლება იყოს მოთხოვნების სიხშირის ან კონკრეტული მოდელის/პროექტის კვოტა; დარჩენილი საერთო ლიმიტი ამას არ გამორიცხავს.",
 request:"პროვაიდერმა მოთხოვნა უარყო (HTTP 400). მოდელის მხარდაჭერა და მოთხოვნის ფორმატი გადასამოწმებელია.",
 upstream:"პროვაიდერის სერვერზე შეფერხებაა (HTTP 5xx). მოგვიანებით სცადე.",
 http:"პროვაიდერმა მოთხოვნა ვერ შეასრულა. API წვდომა გადასამოწმებელია.",
 network:"API-სთან კავშირი ვერ დასრულდა. გადაამოწმე ინტერნეტი და კავშირის პარამეტრები.",
 timeout:"AI პასუხის ლოდინის დრო ამოიწურა (120 წამი). ეს კვოტის ამოწურვას არ ნიშნავს. ავტომატური განმეორება არ გაიგზავნა.",
 incomplete:"მოდელმა პასუხი ვერ დაასრულა ან დაბლოკა. ეს ავტომატურად კვოტის ამოწურვას არ ნიშნავს.",
 output:"პასუხის ფორმატი ან წყაროების მითითებები ვერ დადასტურდა. ეს ავტომატურად კვოტის ამოწურვას არ ნიშნავს.",
 unknown:"ზუსტი მიზეზი შენახული არ არის: პასუხი ან შენახვა ვერ დადასტურდა.",
};
export type AiFailureCode=keyof typeof aiFailures;
export class AiProviderError extends Error {constructor(public readonly code:AiFailureCode){super(aiFailures[code]);}}
export function failureCode(value:unknown):AiFailureCode{return typeof value==="string"&&Object.hasOwn(aiFailures,value)?value as AiFailureCode:"unknown";}
export const AI_REQUEST_TIMEOUT_MS=120_000;
export function transportError(error:unknown,signal?:AbortSignal|null){
 const reason=signal?.reason;
 const timedOut=(error instanceof Error && error.name==="TimeoutError")||(signal?.aborted && reason instanceof Error && reason.name==="TimeoutError");
 return new AiProviderError(timedOut?"timeout":"network");
}
export async function aiResponseText(response:Response,signal?:AbortSignal|null){try{return await response.text();}catch(error){throw transportError(error,signal);}}
export async function aiFetch(fetcher:typeof fetch,url:string,init:RequestInit){
 let response:Response;try{response=await fetcher(url,init);}catch(error){throw transportError(error,init.signal);}
 if(!response.ok){const code:AiFailureCode=response.status===401?"auth":response.status===403?"access":response.status===404?"model":response.status===429?"quota":response.status===400?"request":response.status>=500?"upstream":"http";throw new AiProviderError(code);}
 return response;
}
