import {aiFailures, failureCode} from "@/lib/ai/errors";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { researchPacket } from "@/lib/ai/packet";
import { aiConfig, aiConfigurationStatus, reportSchema } from "@/lib/ai/provider";
import { ActionForm } from "@/components/ActionForm";
import { requestResearch } from "./actions";
export const dynamic="force-dynamic";
const kinds={observation:"დაკვირვება",risk:"რისკი",unknown:"უცნობია",next_step:"შემდეგი ნაბიჯი"};
export default async function AiResearch({params}:{params:Promise<{id:string}>}) {
 await requireOwner(false);
 const {id}=await params;if(!/^[1-9]\d*$/.test(id)||!Number.isSafeInteger(Number(id))||Number(id)>2147483647)notFound();
 const packet=await researchPacket(Number(id));if(!packet)notFound();
 const runs=await prisma.aiResearchRun.findMany({where:{opportunityId:Number(id)},orderBy:{id:"desc"},take:10});
 const config=aiConfig();
 const status=aiConfigurationStatus();
 return <><h1>AI — პროდუქტის კვლევა</h1><p><Link href={`/opportunities/${id}`}>← პროდუქტის მონაცემები</Link></p>
  <p>AI აანალიზებს მხოლოდ ქვემოთ ნაჩვენებ შენახულ მონაცემებს. ინტერნეტში არ ეძებს, შეკვეთებს არ ქმნის და მტკიცებულებებსა თუ ფინანსურ მონაცემებს არ ცვლის. ანგარიში გადასამოწმებელი მონახაზია; წყაროს მითითება დასკვნის სისწორეს არ ადასტურებს.</p>
  <details><summary>გასაგზავნი პაკეტი — {packet.sources.length} წყარო</summary><p>პაკეტი შეიცავს კვლევის ჩანაწერებს, კონკურენტებს, CJ-ის ანგარიშებს, ხარჯების შენიშვნებსა და კალკულატორის შედეგებს. გადაამოწმე პირადი ინფორმაცია გაგზავნამდე. ზოგადი პროდუქტის notes და ანგარიშის საიდუმლო პარამეტრები პაკეტში არ შედის. მოცულობის ლიმიტები პაკეტის დასაწყისშია; ეს ყველა ჩანაწერის სრული სია არ არის.</p><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(packet.snapshot,null,2)}</pre></details>
  <section className="card" aria-labelledby="ai-connection"><h2 id="ai-connection">AI კავშირის შემოწმება</h2><p>{status.ready?"კონფიგურაცია მზადაა. რეალური API წვდომა ჯერ არ შემოწმებულა; ის მხოლოდ შენი თანხმობით კვლევის გაშვებისას მოწმდება.":"კონფიგურაცია შესავსებია. ქვემოთ ჩანს კონკრეტულად რა აკლია."}</p><ul>{status.checks.map(check=><li key={check.id}><b>{check.label}</b> — {check.ok?"მზადაა":"შესასწორებელია"}{!check.ok&&<p className="mut">{check.help}</p>}</li>)}</ul><p className="mut">ეს ადგილობრივი შემოწმებაა: API მოთხოვნას არ აგზავნის და გასაღების მნიშვნელობას არ აჩვენებს. ცვლილებების შემდეგ გააჩერე აპი Ctrl+C-ით და ხელახლა გაუშვი. .env.local ფაილი უნდა იყოს იმავე პროექტში, საიდანაც აპს უშვებ.</p></section>
  {config?<ActionForm action={requestResearch} label="გამოიკვლიე შენახული მონაცემები"><input type="hidden" name="id" value={id}/><input type="hidden" name="hash" value={packet.hash}/><input type="hidden" name="engine" value={`${config.provider}:${config.model}`}/><p>პროვაიდერი: {config.provider} · მოდელი: {config.model}. მაქსიმუმ 2400 გამომავალი ტოკენი, 10 მცდელობა UTC დღეში და 90-წამიანი ინტერვალი მთელ აპზე. ეს თანხობრივი ბიუჯეტი არ არის; წარუმატებელი მოთხოვნაც შეიძლება ფასიანი იყოს.</p><label><input type="checkbox" name="consent" required/> გადავხედე პაკეტს და ვადასტურებ არჩეული პროვაიდერის API-ში გაგზავნას შესაძლო ხარჯით.</label></ActionForm>:<section className="card"><h2>AI ჯერ გამორთულია</h2><p>საჭიროა AI_PROVIDER (gemini ან openai), AI_RESEARCH_MODEL, AI_RESEARCH_ENABLED=true და არჩეული პროვაიდერის GEMINI_API_KEY ან OPENAI_API_KEY. გასაღები ჩატში ან GitHub-ზე არ ატვირთო. ინსტრუქცია: docs/AI-RESEARCH.md პროექტის საქაღალდეში. კონფიგურაციის გარეშე ფასიანი მოთხოვნა არ იგზავნება.</p></section>}
  <h2>ბოლო 10 მცდელობა</h2>{!runs.length&&<p>AI ანგარიში ჯერ არ შექმნილა.</p>}
  {runs.map(run=>{const report=reportSchema.safeParse(run.report);return <section className="card" key={run.id}>
   <h3>#{run.id} · {run.model}</h3><p>{run.createdAt.toISOString()} UTC · {run.state}</p>
   {run.inputHash!==packet.hash&&<p className="warn">მიმდინარე პაკეტი განსხვავდება — შეიცვალა მონაცემი ან კვლევის თარიღი. ძველი ანგარიში შენახვისდროინდელ პაკეტს ეკუთვნის.</p>}
   {run.state==="PENDING"&&<p>მცდელობა დაიწყო; დასრულება ჯერ არ დადასტურებულა. გვერდის გახსნა ან განახლება ხელახლა არ აგზავნის მოთხოვნას.</p>}
   {run.state==="FAILED"&&<p>{aiFailures[failureCode(run.report && typeof run.report==="object" && !Array.isArray(run.report) ? run.report.failureCode : undefined)]} ანგარიშის დასკვნა შენახული არ არის; ავტომატური განმეორება არ ხდება.</p>}
   {run.state==="SUCCEEDED"&&report.success&&report.data.findings.map((f,i)=><article key={i}><b>{kinds[f.kind]}</b><p style={{whiteSpace:"pre-wrap"}}>{f.text}</p><p className="mut">წყაროები: {f.sourceIds.join(", ")} — იხილე ამ ანგარიშის პაკეტში ქვემოთ.</p></article>)}
   <details><summary>ამ მცდელობის შენახული წყაროები</summary><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(run.snapshot,null,2)}</pre></details>
  </section>;})}
 </>;
}
