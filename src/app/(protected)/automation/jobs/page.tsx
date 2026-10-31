import Link from "next/link";
import {randomUUID} from "node:crypto";
import {requireOwner} from "@/lib/auth/server";
import {prisma} from "@/lib/db/prisma";
import {jobsEnabled} from "@/lib/automation/jobs";
import {jobSteps} from "@/lib/automation/job-plan";
import {ActionForm} from "@/components/ActionForm";
import {enqueue,stop} from "./actions";
export const dynamic="force-dynamic";
export default async function Jobs(){
 await requireOwner(false);
 if(!jobsEnabled())return <><h1>ფონური კვლევა</h1><p>ჯერ გამორთულია. დაყენება აღწერილია README-ის Background research განყოფილებაში.</p><Link href="/automation">ავტომატიზაცია</Link></>;
 const [jobs,choices,markets]=await Promise.all([
  prisma.researchJob.findMany({orderBy:{createdAt:"desc"},take:20}),
  prisma.sourceListing.findMany({where:{provider:"cj",importedVia:"CJ_API",opportunityId:{not:null}},select:{id:true,name:true},orderBy:{id:"desc"},take:100}),
  prisma.market.findMany({select:{id:true,code:true},orderBy:{code:"asc"},take:100}),
 ]);
 return <><h1>ფონური კვლევა</h1><p>ბრაუზერის დახურვის შემდეგ დავალება ბაზაში რჩება. შესრულებისთვის კომპიუტერი და <code>npm run research:worker</code> ჩართული უნდა იყოს. ერთდროულად ერთი დავალებაა დაშვებული.</p>
 <p>თითო კანდიდატზე განახლდება მარაგი/ვარიანტები და მაქსიმუმ 3 უკვე შენახული მარშრუტი. მარშრუტის არქონისას მიწოდების მოთხოვნა არ შესრულდება. ეტაპებს შორის მინიმუმ 61 წამია. შეცდომა რიგს აჩერებს; გაურკვეველი მოთხოვნა ავტომატურად არ მეორდება. AI ცალკე თანხმობას მოითხოვს.</p>
 <form method="get" action="/automation/jobs"><button>განაახლე სია</button></form><p><Link href="/automation">ავტომატიზაცია</Link></p>
 <ActionForm action={enqueue} label="შეინახე ფონური დავალება"><input type="hidden" name="requestId" value={randomUUID()}/>
 <label>კანდიდატები — აირჩიე 1–3<select name="listingId" multiple required size={5}>{choices.map(c=><option key={c.id} value={c.id}>#{c.id} · {c.name}</option>)}</select></label>
 <label>eBay ბაზარი (არასავალდებულო)<select name="marketId"><option value="">eBay-ის გარეშე</option>{markets.map(m=><option key={m.id} value={m.id}>{m.code}</option>)}</select></label>
 <label><input type="checkbox" name="confirmed" required/> ვეთანხმები CJ-ის და არჩეული eBay ეტაპის რეალურ API მოთხოვნებს ანგარიშის პირობების ფარგლებში.</label></ActionForm>
 <h2>ბოლო 20 დავალება</h2>{!jobs.length&&<p>ჯერ დავალებები არ არის.</p>}
 {jobs.map(job=>{const steps=jobSteps.parse(job.steps);return <section className="card" key={job.id}><h3>{job.state}</h3><p>{job.createdAt.toISOString()} · დასრულებული ეტაპები: {job.cursor}/{steps.length}</p>
 {job.state==="INTERRUPTED"&&<p className="warn">Worker-ის კავშირი შეწყდა. მიმდინარე მოთხოვნის შედეგი გაურკვეველია; ახალი დავალების შექმნამდე გადაამოწმე მიღებული ჩანაწერები.</p>}
 {job.stopRequested&&<p>შეჩერება მოთხოვნილია.</p>}
 {["QUEUED","RUNNING"].includes(job.state)&&<ActionForm action={stop} label="შეაჩერე"><input type="hidden" name="id" value={job.id}/></ActionForm>}
 <ol>{steps.map((s,i)=><li key={i}><Link href={`/discovery/${s.listingId}`}>#{s.listingId}</Link> · {s.kind} · {s.state}<p>{s.message}</p></li>)}</ol>
 <Link href={`/automation/review?ids=${[...new Set(steps.map(s=>s.listingId))].join(",")}`}>ერთიანი მიმოხილვა და AI</Link>
 </section>;})}</>;
}
