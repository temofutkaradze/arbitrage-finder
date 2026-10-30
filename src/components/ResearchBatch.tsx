"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {unstable_rethrow} from "next/navigation";
import {prepareResearchBatch} from "@/app/(protected)/automation/batch-actions";
import {startProductRefresh,refreshSavedRoute} from "@/app/(protected)/discovery/[id]/refresh-actions";
import {runResearchBatch,waitForCj,type BatchEvent} from "@/lib/automation/research-batch";
export function ResearchBatch({choices}:{choices:{id:number;name:string}[]}){
 const [selection,setSelection]=useState(["","",""]),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[seconds,setSeconds]=useState(0),[events,setEvents]=useState<BatchEvent[]>([]),[message,setMessage]=useState("");
 const running=useRef(false),controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function start(){
  if(running.current||!consent)return;
  running.current=true;setBusy(true);setEvents([]);setMessage("შერჩევა მოწმდება…");
  const cancel=new AbortController();controller.current=cancel;
  try{
   const prepared=await prepareResearchBatch(selection.filter(Boolean).map(Number));
   if(!prepared.ok){setMessage(prepared.message);return;}
   const state=await runResearchBatch(prepared.ids,{start:startProductRefresh,route:refreshSavedRoute,wait:()=>waitForCj(cancel.signal,setSeconds),event:e=>setEvents(old=>[...old,e])},cancel.signal);
   setMessage(state==="finished"?"CJ ნაწილის დამუშავება დასრულდა. გადაამოწმე blocked ეტაპები. ფასები ხარჯებში არ გამოყენებულა; სრული კვლევა ჯერ არ დასრულებულა.":state==="stopped"?"შეჩერებულია. მიმდინარე მოთხოვნა შეიძლება დასრულდეს და შეინახოს შედეგი; მომდევნო არ გაიგზავნება.":"შეცდომის შემდეგ რიგი შეჩერდა. გადაამოწმე შენახული მონაცემები ხელახლა გაშვებამდე.");
  }catch(error){unstable_rethrow(error);setMessage("პასუხი ვერ დადასტურდა. გაგზავნილი მოთხოვნა შეიძლება შენახული იყოს; ავტომატური განმეორება არ ხდება.");}
  finally{running.current=false;setBusy(false);setSeconds(0);}
 }
 const labels={running:"მიმდინარეობს",done:"პასუხი მიღებულია",blocked:"დასაზუსტებელია",failed:"ვერ დასრულდა"};
 return <section className="card" aria-labelledby="batch-title"><h2 id="batch-title">ჯგუფური კვლევა — CJ ეტაპი</h2><p>აირჩიე მაქსიმუმ 3 შენახული CJ კანდიდატი. თითოეულზე განახლდება ვარიანტები/მარაგი და მაქსიმუმ 3 განსხვავებული შენახული მიწოდების მარშრუტი. მოთხოვნებს შორის 31-წამიანი ინტერვალია; რამდენიმე წუთი შეიძლება დასჭირდეს.</p><p className="mut">ეს ბრაუზერში გაშვებული პროცედურაა: დახურვა/Stop აჩერებს დარჩენილ ნაბიჯებს, მიმდინარე მოთხოვნა შეიძლება შეინახოს. ეტაპების სია ამ გვერდის დახურვისას იკარგება, მიღებული ანგარიშები ბაზაში რჩება. შეცდომაზე რიგი ჩერდება; ხელახალი გაშვება ახალი მოთხოვნებია. eBay, მოთხოვნის შეფასება და AI ამ ეტაპში არ სრულდება.</p>
 {!choices.length?<p>ჯერ შენახული CJ კანდიდატი არ არის. <Link href="/discovery">მოძებნე კანდიდატი</Link> და აირჩიე Investigate this candidate.</p>:<><div className="grid">{selection.map((value,i)=><label key={i}>კანდიდატი {i+1}{i>0?" (არასავალდებულო)":""}<select disabled={busy} value={value} onChange={e=>setSelection(old=>old.map((v,j)=>i===j?e.target.value:v))}><option value="">აირჩიე კანდიდატი</option>{choices.map(c=><option key={c.id} value={c.id}>#{c.id} · {c.name}</option>)}</select></label>)}</div><p className="mut">შერჩევაში მაქსიმუმ ბოლო 100 შენახული CJ ჩანაწერია.</p><label><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/> ვეთანხმები CJ-ის რეალური read-only მოთხოვნების გაშვებას ანგარიშის კვოტის/პირობების ფარგლებში.</label><div className="bar"><button type="button" disabled={busy||!consent||!selection.some(Boolean)} onClick={start}>გაუშვი CJ ეტაპი</button>{busy&&<button type="button" onClick={()=>controller.current?.abort()}>Stop</button>}</div></>}
 <p role="status">{message}{seconds>0?` შემდეგ მოთხოვნამდე: ${seconds} წამი.`:""}</p><ol aria-label="ჯგუფური კვლევის ეტაპები">{events.map((e,i)=><li key={i}><Link href={`/discovery/${e.id}`}>#{e.id}</Link> · {e.stage==="supplier"?"ვარიანტები/მარაგი":"მიწოდება"} · <b>{labels[e.state]}</b><p style={{whiteSpace:"pre-wrap"}}>{e.message}</p></li>)}</ol></section>;
}
