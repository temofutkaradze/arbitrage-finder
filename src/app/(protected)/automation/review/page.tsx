import {BusinessPlanning} from "@/components/BusinessPlanning";
import Link from "next/link";
import {notFound} from "next/navigation";
import {requireOwner} from "@/lib/auth/server";
import {prisma} from "@/lib/db/prisma";
import {parseBatchReview} from "@/lib/automation/batch-review";
import {rowsToInputs} from "@/lib/data/queries";
import {calculate} from "@/lib/profit/calculate";
import {formatMoney} from "@/lib/profit/format";
import {INPUT_DEFS} from "@/lib/profit/types";
import {researchReadiness} from "@/lib/research/readiness";
import {researchPacket} from "@/lib/ai/packet";
import {aiConfig} from "@/lib/ai/provider";
import {ActionForm} from "@/components/ActionForm";
import {requestResearch} from "@/app/(protected)/opportunities/[id]/ai/actions";
import {CompetitorScenarios} from "@/components/CompetitorScenarios";
export const dynamic="force-dynamic";
export default async function BatchReview({searchParams}:{searchParams:Promise<{ids?:string;market?:string}>}){
 await requireOwner(false);
 const sp=await searchParams;
 let selection:ReturnType<typeof parseBatchReview>;
 try{selection=parseBatchReview(sp.ids,sp.market);}catch{notFound();}
 const listings=await prisma.sourceListing.findMany({where:{id:{in:selection.ids},provider:"cj",importedVia:"CJ_API",opportunityId:{not:null}},select:{id:true,opportunityId:true}});
 if(listings.length!==selection.ids.length)notFound();
 const ids=[...new Set(selection.ids.map(id=>listings.find(l=>l.id===id)!.opportunityId!))];
 const products=await prisma.opportunity.findMany({where:{id:{in:ids}},include:{evaluations:{where:selection.marketId?{marketId:selection.marketId}:{},orderBy:{id:"asc"},take:20,include:{market:true,inputs:true}},evidence:{orderBy:{id:"desc"},take:30},competitors:{orderBy:[{observedAt:"desc"},{id:"desc"}],take:100}}});
 if(products.length!==ids.length)notFound();
 const config=aiConfig(),now=new Date();
 return <><h1>ჯგუფური კვლევის მიმოხილვა</h1><p><Link href="/automation">← ავტომატიზაცია</Link> · {products.length} პროდუქტი. ეს შენახული მონაცემების მიმდინარე მიმოხილვაა და არა გაშვების დამოუკიდებელი ჟურნალი.</p>
 <p className="mut">გახსნა გარე API-ს არ იძახებს და ხარჯებს არ ცვლის. განახლების ჩავარდნა შეიძლება ძველ მონაცემებს ტოვებდეს — გადაამოწმე დაკვირვების თარიღები. ვალუტები არ ჯამდება; pending შეთავაზება ჯერ გადამოწმებული კონკურენტი არ არის. ფიქსირებული ბიზნესხარჯები და საშემოსავლო გადასახადი კონტრიბუციაში არ შედის.</p>
 {await Promise.all(ids.map(async id=>{
  const p=products.find(p=>p.id===id)!;
  const pending=await prisma.externalOffer.count({where:{opportunityId:id,state:"PENDING",...(selection.marketId?{marketId:selection.marketId}:{})}});
  let packet:Awaited<ReturnType<typeof researchPacket>>=null,packetBlocked=false;
  if(!p.isSample){try{packet=await researchPacket(id);}catch{packetBlocked=true;}}
  return <section className="card" key={id}><h2><Link href={`/opportunities/${id}`}>{p.name}</Link>{p.isSample?" · SAMPLE":""}</h2>
  <div className="bar"><Link href={`/research?product=${id}${selection.marketId?`&market=${selection.marketId}`:""}`}>წყაროები და შეთავაზებების გადახედვა</Link><Link href={`/opportunities/${id}/ai`}>AI ანგარიშების ისტორია</Link><a href={`/opportunities/${id}/report?format=json`} download>ჩამოტვირთე კვლევა</a></div>
  <p>{pending} pending შეთავაზება (ვადაგასულიც შეიძლება შედიოდეს). ზუსტი შედარება ხელით გადაამოწმე.</p>
  {!p.evaluations.length&&<p className="warn">არჩეული ბაზრის შეფასება არ არის. პროდუქტის გვერდზე დაამატე ბაზარი; ქვეყანა და ფასი ავტომატურად არ შეგვირჩევია.</p>}
  <p className="mut">მიმოხილვა: მაქსიმუმ 20 შეფასება, ბოლო 30 მტკიცებულება და 100 კონკურენტის დაკვირვება თითო პროდუქტზე. ეს ყველა წყაროს სრული სია ან ბაზრის აღწერა არ არის.</p>
  {p.evaluations.map(e=>{
   const inputs=rowsToInputs(e.inputs),result=calculate(inputs,{pricesIncludeTax:e.market.pricesIncludeTax}),research=researchReadiness(p.evidence,e.marketId,now);
   return <section key={e.id} aria-label={`${e.market.code} ეკონომიკა`}><h3>{e.market.code} · {e.market.currency}</h3><p>კვლევა: {research.label}. {research.missing.length?`მტკიცებულება აკლია: ${research.missing.join(', ')}`:research.next}</p>
   {!result.complete?<p className="warn">სრული გამოთვლა ვერ სრულდება. აუცილებელი უცნობები: {result.missing.map(key=>INPUT_DEFS.find(d=>d.key===key)!.label).join('; ')}.</p>:<><div className="cards"><div><span className="mut">კონტრიბუცია რეკლამის შემდეგ / შეკვეთა</span><b className={result.netProfit>0?"pos":"neg"}>{formatMoney(result.netProfit,e.market.currency)}</b></div><div><span className="mut">მაქსიმალური CAC მოდელის მიხედვით</span><b>{formatMoney(result.maxAffordableCac,e.market.currency)}</b></div></div><p className="mut">{result.quality==="estimated"?"შეიცავს შეფასებით მონაცემებს":"მომხმარებლის მიერ დადასტურებულად მონიშნული მონაცემებია"}. დამატებითი უცნობი ხარჯები ნულადაა ჩათვლილი: {result.assumedZero.length}. დადებითი გამოთვლა გაყიდვების ან მოგების გარანტია არაა.</p></>}
   <BusinessPlanning inputs={inputs} currency={e.market.currency} pricesIncludeTax={e.market.pricesIncludeTax}/>
   <CompetitorScenarios productId={id} rows={p.competitors} inputs={inputs} market={e.market}/>
   </section>;
  })}
  <h3>AI მიმოხილვა — ცალკე თანხმობით</h3><p>AI აანალიზებს შენახულ წყაროებს; მოთხოვნასა და მოგებას დამოუკიდებლად არ ადასტურებს. ქვემოთ გასაგზავნი პაკეტი მთელი პროდუქტისთვისაა და შეიძლება სხვა ბაზრების მონაცემებსაც შეიცავდეს, მიუხედავად ზედა ფინანსური ფილტრისა. ზოგადი პროდუქტის notes და ანგარიშის საიდუმლო პარამეტრები არ იგზავნება; წყაროსა და ხარჯის შენიშვნები შეიძლება პირად ინფორმაციას შეიცავდეს.</p>
  {packet?<><details><summary>გასაგზავნი პაკეტის გადახედვა — {packet.sources.length} წყარო</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(packet.snapshot,null,2)}</pre></details>{config?<ActionForm action={requestResearch} label="გაუშვი ამ პროდუქტის AI კვლევა"><input type="hidden" name="id" value={id}/><input type="hidden" name="hash" value={packet.hash}/><input type="hidden" name="engine" value={`${config.provider}:${config.model}`}/><p>{config.provider} · {config.model}. მაქსიმუმ 2400 გამომავალი ტოკენი და 120 წამი. საერთო ლიმიტი: 10 მცდელობა UTC დღეში, მინიმუმ 90 წამი მცდელობებს შორის. წარუმატებელი მოთხოვნაც შეიძლება ფასიანი იყოს.</p><label><input type="checkbox" name="consent" required/> გადავხედე ამ პროდუქტის პაკეტს და ვეთანხმები პროვაიდერთან გაგზავნას შესაძლო ხარჯით.</label></ActionForm>:<p>AI კონფიგურაცია შესავსებია — <Link href={`/opportunities/${id}/ai`}>გახსენი კავშირის შემოწმება</Link>.</p>}</>:<p>{p.isSample?"SAMPLE პროდუქტზე AI გაგზავნა გამორთულია.":packetBlocked?"პაკეტი ვერ მომზადდა. გახსენი პროდუქტი და გადაამოწმე მონაცემები ან დიდი შენიშვნები. მოთხოვნა არ გაგზავნილა.":"პროდუქტის AI პაკეტი მიუწვდომელია."}</p>}
  </section>;
 }))}
 </>;
}
