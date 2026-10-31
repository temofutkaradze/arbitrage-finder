"use client";
import {useMemo,useState} from "react";
import {businessPlan,type BusinessAssumptions} from "@/lib/profit/business-plan";
import {formatMoney} from "@/lib/profit/format";
import type {Inputs} from "@/lib/profit/types";
const fields=[
 {key:'monthlyFixed',label:'თვიური ფიქსირებული ბიზნესხარჯი',unit:'money'},
 {key:'monthlyOrders',label:'თვიური შეკვეთები — სცენარი, არა პროგნოზი',unit:'count'},
 {key:'targetMarginBp',label:'მიზნობრივი საოპერაციო მარჟა (%)',unit:'percent'},
 {key:'buffer',label:'გაურკვევლობის ბუფერი / შეკვეთა',unit:'money'},
 {key:'payoutDays',label:'ჩარიცხვის დაგვიანება (დღე)',unit:'count'},
 {key:'dailyOrders',label:'დღიური შეკვეთები — სცენარი',unit:'count'},
 {key:'cashReserve',label:'დამატებითი ფულადი რეზერვი',unit:'money'},
] as const;
export function BusinessPlanning({inputs,currency,pricesIncludeTax}:{inputs:Inputs;currency:string;pricesIncludeTax:boolean}){
 const [values,setValues]=useState<Record<string,string>>({});
 const computed=useMemo(()=>{
  try{
   const a={} as BusinessAssumptions;
   for(const f of fields){const s=(values[f.key]??'').trim().replace(',','.');if(!s){a[f.key]=null;continue;}
    if(!(f.unit==='count'?/^\d+$/:/^\d+(\.\d{1,2})?$/).test(s))throw new Error('გამოიყენე არაუარყოფითი თანხა მაქსიმუმ 2 ათწილადით, რაოდენობა/დღე — მთელი რიცხვით.');
    a[f.key]=Math.round(Number(s)*(f.unit==='count'?1:100));
   }
   return {value:businessPlan(inputs,{pricesIncludeTax},a),error:null};
  }catch{return {value:null,error:'შეამოწმე მნიშვნელობები: თვიური რაოდენობა უნდა იყოს დადებითი, მარჟა 0–100%, თანხები/რაოდენობები მხარდაჭერილ დიაპაზონში.'};}
 },[inputs,pricesIncludeTax,values]);
 const m=(n:number)=>formatMoney(n,currency),r=computed.value;
 return <details><summary>ბიზნესგეგმა — მიზნობრივი მოგება, სტრესი და კაპიტალი</summary><section className="card"><h3>გადაწყვეტილების სცენარი</h3><p>ეს დროებითი, შეფასებითი გათვლაა: არაფერი ინახება და კვლევის წყაროებს არ ცვლის. ცარიელი ველი უცნობია; ნული შეიყვანე მხოლოდ შესაბამისი საფუძვლით. ფიქსირებულ ხარჯში არ გაიმეორო უკვე ერთეულის ხარჯებში შეტანილი თანხა.</p>
 <p className="mut">თვიური მინიმალური საკომისიოდან დაამატე მხოლოდ უკვე დათვლილი საკომისიოს ზემოთ დარჩენილი თანხა.</p>
 <div className="grid">{fields.map(f=><label key={f.key}>{f.label}{f.unit==='money'?` (${currency})`:''}<input type="text" inputMode={f.unit==='count'?'numeric':'decimal'} value={values[f.key]??''} onChange={e=>setValues(v=>({...v,[f.key]:e.target.value}))}/></label>)}</div>
 {computed.error&&<p className="warn">{computed.error}</p>}
 {r&&!r.base.complete&&<p className="warn">ჯერ შეავსე შეფასების აუცილებელი უცნობი ხარჯები. ბიზნესგეგმა მოგების რიცხვს ვერ გამოითვლის.</p>}
 {r?.base.complete&&<>{r.base.assumedZero.length>0&&<p className="warn">ძირითად გათვლაში {r.base.assumedZero.length} დამატებითი უცნობი ხარჯი ნულადაა მიჩნეული. ბიზნესსცენარიც ამ დაშვებას იყენებს; გადაამოწმე შეფასებაში.</p>}<p className="mut">ერთობლივი სტრესი: პროდუქტის გასაყიდი ფასი −5%, მომწოდებელი და მიწოდება +10%, CAC +25%, დაბრუნებების სიხშირე +2 პროცენტული პუნქტი (მაქსიმუმ 100%). ეს პირობითი სენსიტიურობის სცენარია, არა ალბათობა ან პროგნოზი; ნულოვანი CAC პროცენტულად კვლავ ნულია.</p>
 {r.stress?.complete&&<p>სტრესში კონტრიბუცია რეკლამის შემდეგ, ფიქსირებულ ხარჯამდე: <b>{m(r.stress.netProfit)}</b>.</p>}
 {r.plan?<><div className="cards"><div><span className="mut">მიზნისთვის დასაშვები CAC</span><b>{r.plan.maxTargetCac>=0?m(r.plan.maxTargetCac):'ბიუჯეტი არ რჩება'}</b></div><div><span className="mut">ფიქსირებულის/ბუფერის შემდეგ / შეკვეთა</span><b>{m(r.plan.perOrder)}</b></div><div><span className="mut">კონსერვატიული თვიური სცენარი</span><b>{m(r.plan.monthly)}</b></div></div><p>ფიქსირებულის წილი: {m(r.plan.fixedPerOrder)} / შეკვეთა. მიზნობრივი მოგება: {m(r.plan.targetProfit)}. ფიქსირებულის დასაფარად საჭირო შეკვეთები მიმდინარე ერთეულის ეკონომიკით: {r.plan.breakEvenOrders??'რაოდენობით ვერ იფარება'}. მოცულობა თავისთავად CAC-სა და მოთხოვნას არ ადასტურებს.</p>
 <p>ერთობლივ სტრესში ფიქსირებულის/ბუფერის შემდეგ: {r.plan.stressPerOrder===null?'უცნობია':m(r.plan.stressPerOrder)} / შეკვეთა.</p><p className="mut">მიზნობრივი CAC = კონტრიბუცია რეკლამამდე − ფიქსირებული ხარჯის წილი − ბუფერი − მიზნობრივი მოგება. მიმდინარე CAC-ს ამ ზღვარს ხელით შეადარე. ერთეულზე ფიქსირებული ხარჯი მაღლა მრგვალდება; თვიური სცენარი ამ კონსერვატიულ ერთეულს ეფუძნება. საშემოსავლო გადასახადი არ შედის.</p></>:<p>მიზნობრივი CAC-ისთვის შეავსე ფიქსირებული ხარჯი, თვიური რაოდენობა, მიზნობრივი მარჟა და ბუფერი.</p>}
 {r.cash?<p>ლიკვიდობის ილუსტრაცია: <b>{m(r.cash.amount)}</b> = დღიური მოდელირებული ცვლადი ხარჯი {m(r.cash.dailyOutflow)} × დაგვიანების დღეები + სრული თვის ფიქსირებული ხარჯი + დამატებითი რეზერვი.</p>:<p>ლიკვიდობისთვის შეავსე ფიქსირებული ხარჯი, დღიური რაოდენობა, ჩარიცხვის დღეები და რეზერვი.</p>}
 <p className="mut">ლიკვიდობა ხარჯი/მოგება არ არის. ეს კონსერვატიული წინასწარი დაფინანსების ილუსტრაციაა და არა რეალური პიკური ფულადი ნაკადი: ბანკის rolling reserve, payout გრაფიკი, დაბლოკილი თანხა და დაბრუნებების დრო ცალკე უნდა გადაამოწმო. დამატებითი რეზერვი საჭირო შემთხვევებს შენ უნდა მოარგო.</p></>}
 <p className="mut">დაბრუნების ხარჯში გადაამოწმე refund, დაბრუნების ტრანსპორტი, დაუბრუნებელი საკომისიო და საქონლის აღდგენილი ღირებულება; უკვე დათვლილი მომწოდებლის/მიწოდების თანხა მეორედ არ ჩათვალო. ერთდროული return/chargeback/damage დაშვებებიც ერთი ზარალის დუბლირებას არ უნდა იწვევდეს.</p>
 </section></details>;
}
