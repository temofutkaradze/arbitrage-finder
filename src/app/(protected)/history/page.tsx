import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { readSnapshot, snapshotChanges, historyValue, savedContribution } from "@/lib/finance-history/view";
export const dynamic = "force-dynamic";
const kindLabels: Record<string,string> = { MARKET_CREATED: "ბაზარი შეიქმნა", EVALUATION_CREATED: "შეფასება შეიქმნა", MANUAL_INPUTS: "ხელით შენახვა", CJ_QUOTE: "CJ quote-ის გამოყენება", MARKET_SETTINGS: "ბაზრის პარამეტრები", MARKET_CONTEXT: "ბაზრის ცვლილების გავლენა" };
export default async function History({searchParams}:{searchParams:Promise<{evaluation?:string;market?:string;before?:string}>}){
 await requireOwner(false);
 const sp=await searchParams;
 const parse=(s:string|undefined)=>{if(s===undefined)return undefined;const n=Number(s);if(!/^[1-9]\d*$/.test(s)||!Number.isSafeInteger(n)||n>2147483647)notFound();return n;};
 const evaluationId=parse(sp.evaluation),marketId=parse(sp.market),beforeId=parse(sp.before);
 if(evaluationId!==undefined&&marketId!==undefined)notFound();
 const records=await prisma.financialChange.findMany({where:{...(evaluationId===undefined?{}:{evaluationId}),...(marketId===undefined?{}:{marketId}),...(beforeId===undefined?{}:{id:{lt:beforeId}})},orderBy:{id:"desc"},take:51});
 const page=records.slice(0,50),older=new URLSearchParams();if(evaluationId!==undefined)older.set("evaluation",String(evaluationId));if(marketId!==undefined)older.set("market",String(marketId));if(page.length)older.set("before",String(page.at(-1)!.id));
 const date=(d:Date)=>new Intl.DateTimeFormat("ka-GE",{timeZone:"Asia/Tbilisi",dateStyle:"medium",timeStyle:"short"}).format(d);
 return <><h1>ფინანსური ცვლილებების ისტორია</h1><p>შენახვის დრო, მოქმედების წყარო და ძველი/ახალი მონაცემები. ისტორია იწყება ფუნქციის დამატებიდან; მანამდე მომხდარ ცვლილებებს არ ვიგონებთ.</p>
 <p className="mut">ისტორია ეკუთვნის შესაბამის შეფასებას/ბაზარს: მათი წაშლა მათ ისტორიასაც შლის. გრძელვადიანი შენახვისთვის გამოიყენე ბაზის backup. ეს არ არის აღდგენის ღილაკი ან დამოუკიდებელი აუდიტის დასკვნა. VERIFIED მომხმარებლის მინიჭებული სტატუსია და არა დამოუკიდებელი სერტიფიცირება.</p>
 {(evaluationId!==undefined||marketId!==undefined)&&<p>ფილტრი: {evaluationId!==undefined?`შეფასება #${evaluationId}`:`ბაზარი #${marketId}`} · <Link href="/history">ყველა ჩანაწერი</Link></p>}
 {!page.length&&<section className="card"><p>ამ ფილტრით ცვლილებები ჯერ არ არის აღრიცხული.</p><p>პროდუქტის ძიება და კვლევის გვერდის ნახვა ფინანსურ ცვლილებას არ ქმნის. ჩანაწერი ჩნდება ბაზრის ან შეფასების შექმნისა და ფინანსური მონაცემების შენახვისას.</p><Link href="/products">გახსენი პროდუქტი და მისი შეფასება</Link>{(evaluationId!==undefined||marketId!==undefined||beforeId!==undefined)&&<p><Link href="/history">ყველა ფინანსური ცვლილება</Link></p>}</section>}
 {page.map(r=>{const before=readSnapshot(r.before),after=readSnapshot(r.after),changes=after?snapshotChanges(before,after):[];return <section className="card" key={r.id}>
  <h2>{kindLabels[r.kind]??r.kind} · {after?.product?.name??after?.market.name??`ჩანაწერი #${r.recordId}`}</h2>
  <p>{date(r.createdAt)} — თბილისის დრო · <span className="mut">UTC {r.createdAt.toISOString()} · #{r.id} · ვერსია {before?.version??"შექმნამდე"} → {r.version}</span></p>
  {after&&<p>{after.market.code} · {after.market.currency} · {r.evaluationId?<Link href={`/opportunities/${after.product?.id}`}>შეფასების პროდუქტი</Link>:<Link href="/markets">ბაზრის პარამეტრები</Link>}</p>}
  {after&&before&&(before.market.countryCode!==after.market.countryCode||before.market.pricesIncludeTax!==after.market.pricesIncludeTax)&&<p className="warn">მიმართულება: {before.market.countryCode??"უცნობია"} → {after.market.countryCode??"უცნობია"}; ფასი გადასახადს შეიცავს: {String(before.market.pricesIncludeTax)} → {String(after.market.pricesIncludeTax)}.</p>}
  {after?.entity==="EVALUATION"&&<p>შენახვისას გამოთვლილი კონტრიბუცია რეკლამის შემდეგ: {before?savedContribution(before):"შეფასება ჯერ არ არსებობდა"} → {savedContribution(after)}. ეს იმდროინდელ ვარაუდებზეა დამოკიდებული; ფიქსირებულ ზედნადებსა და ბიზნესის მოგების გადასახადს არ მოიცავს.</p>}
  {!!changes.length&&<div className="wrap"><table><thead><tr><th>მონაცემი</th><th>მანამდე</th><th>შემდეგ</th></tr></thead><tbody>{changes.map(c=><tr key={c.key}><td>{c.label}</td><td>{historyValue(c.key,c.before,before?.market.currency??after!.market.currency)}<p style={{whiteSpace:"pre-wrap",maxWidth:360,overflowWrap:"anywhere"}}>შენიშვნა: {c.before?.note??"არ არის"}</p></td><td>{historyValue(c.key,c.after,after!.market.currency)}<p style={{whiteSpace:"pre-wrap",maxWidth:360,overflowWrap:"anywhere"}}>შენიშვნა: {c.after?.note??"არ არის"}</p></td></tr>)}</tbody></table></div>}
  {after&&!changes.length&&<p>მნიშვნელობები/სტატუსები/შენიშვნები არ შეცვლილა. შენახვა ან ბაზრის კონტექსტის ცვლილება მაინც აღირიცხა.</p>}
  {!after&&<p>ჩანაწერის ფორმატი ამ ვერსიით ვერ იკითხება; იხილე შენახული დეტალები.</p>}
  <details><summary>მოქმედების წყარო და სრული სურათები</summary><p className="mut">თანხები minor units-შია, პროცენტები basis points-ში. UNKNOWN სტატუსი დადასტურებული ნული არ არის. კალკულატორი: contribution-v1; მომავალმა ფორმულამ შეიძლება სხვაგვარად გამოთვალოს.</p><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify({context:r.context,before:r.before,after:r.after},null,2)}</pre></details>
 </section>;})}
 {records.length>50&&<p><Link href={`/history?${older}`}>ძველი ჩანაწერები →</Link></p>}
 </>;
}
