"use client";
import { useEffect,useRef,useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { startProductRefresh,refreshSavedRoute } from "@/app/(protected)/discovery/[id]/refresh-actions";
function pause(signal:AbortSignal,onTick:(n:number)=>void){
 return new Promise<boolean>(resolve=>{
  if(signal.aborted){resolve(false);return;}
  let left=31;onTick(left);
  const finish=(ok:boolean)=>{clearInterval(timer);signal.removeEventListener("abort",stop);onTick(0);resolve(ok);};
  const stop=()=>finish(false);
  const timer=setInterval(()=>{left--;onTick(left);if(left===0)finish(true);},1000);
  signal.addEventListener("abort",stop,{once:true});
 });
}
export function ProductRefresh({listingId}:{listingId:number}){
 const running=useRef(false),controller=useRef<AbortController|null>(null);
 const [busy,setBusy]=useState(false),[seconds,setSeconds]=useState(0),[messages,setMessages]=useState<string[]>([]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const append=(message:string)=>setMessages(m=>[...m,message]);
 async function run(){
  if(running.current)return;running.current=true;setBusy(true);setMessages([]);
  const cancel=new AbortController();controller.current=cancel;
  try{
   append("ვარიანტის ფასისა და მარაგის განახლება…");
   const result=await startProductRefresh(listingId);append(result.message);result.changes.forEach(append);
   if(!result.ok||cancel.signal.aborted)return;
   if(!result.routes.length)append("შენახული მარშრუტი არ არის — პირველი მიწოდების მოთხოვნა ქვემოთ ხელით შეავსე.");
   for(const route of result.routes){
    append(`ინტერვალის დაცვა: ${route.label}`);
    if(!await pause(cancel.signal,setSeconds))return;
    append(`მიწოდების მოთხოვნა: ${route.label}`);
    const updated=await refreshSavedRoute(listingId,route.quoteId);append(updated.message);
    if(!updated.ok){append("პროცესი გაჩერდა. დარჩენილი მარშრუტები არ განახლებულა.");return;}
    if(cancel.signal.aborted)return;
   }
   append("პროცესი დასრულდა. ახალი შეთავაზებების სანახავად განაახლე გვერდი. ფინანსური მონაცემები არ შეცვლილა.");
  }catch(e){unstable_rethrow(e);append("პასუხი ვერ დადასტურდა. გადაამოწმე გვერდი ხელახლა გაშვებამდე; მოთხოვნა ავტომატურად არ განმეორდება.");}
  finally{if(cancel.signal.aborted)append("შეჩერებულია: უკვე გაგზავნილი მოთხოვნა შეიძლება დასრულდეს და შეინახოს შედეგი.");running.current=false;setBusy(false);setSeconds(0);}
 }
 return <section className="card"><h2>განაახლე პროდუქტის მონაცემები</h2><p>ერთი პროცესი: CJ ვარიანტები და მარაგი, შემდეგ მაქსიმუმ 3 განსხვავებული შენახული მარშრუტი ბოლო 100 შეთავაზებიდან. ყოველი მარშრუტი ერთ ერთეულზეა. ფასი ფინანსურ შეფასებაში ავტომატურად არ გადაიწერება.</p><p className="mut">ეს არ არის ფონური სამუშაო: გვერდის დახურვა ან Stop დარჩენილ ნაბიჯებს აჩერებს; გაგზავნილი მოთხოვნა შეიძლება მაინც დასრულდეს. შეცდომისას ავტომატური განმეორება არ ხდება. სხვა CJ მოქმედება საერთო cooldown-ს იყენებს და შეიძლება პროცესი შეაჩეროს.</p>
 <button type="button" disabled={busy} onClick={run}>{busy?"მიმდინარეობს…":"განაახლე პროდუქტის მონაცემები"}</button>{busy&&<button type="button" onClick={()=>controller.current?.abort()}>Stop</button>}
 <p role="status">{seconds>0?`შემდეგ მოთხოვნამდე: ${seconds} წამი`:busy?"მუშავდება…":""}</p><ol aria-label="განახლების შედეგები">{messages.map((m,i)=><li key={i}>{m}</li>)}</ol>
 </section>;
}
