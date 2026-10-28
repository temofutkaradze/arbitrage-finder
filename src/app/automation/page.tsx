import { prisma } from "@/lib/db/prisma";
import { ActionForm } from "@/components/ActionForm";
import { utcDayStart, DAILY_ATTEMPT_LIMIT } from "@/lib/automation/policy";
import { addSchedule, changeSchedule } from "./actions";
export const dynamic = "force-dynamic";
export default async function Automation() {
  const [jobs, executions, heartbeat, attempts] = await Promise.all([
    prisma.discoverySchedule.findMany({ orderBy: { id: "desc" } }),
    prisma.discoveryExecution.findMany({ orderBy: { startedAt: "desc" }, take: 30, include: { schedule: true } }),
    prisma.discoveryWorkerStatus.findUnique({ where: { id: "cj" } }),
    prisma.discoveryExecution.count({ where: { startedAt: { gte: utcDayStart(new Date()) }, state: { notIn: ["DEFERRED"] } } }),
  ]);
  return <>
    <h1>Recurring discovery</h1><p className="mut">User-selected product phrases only. No market, product category, spending plan or store publication is chosen for you.</p>
    <section className="card"><h2>Request limits</h2><p>{attempts} / {DAILY_ATTEMPT_LIMIT} scheduled attempts today (UTC). Failed, interrupted and cancelled attempts count; shared-cooldown deferrals do not. Manual searches have their own controls.</p><p className="mut">At most 5 enabled schedules, every 6–168 hours. Each attempt fetches one page of up to 20 newest matching CJ catalogue products; it may miss products beyond that page. Authentication can add up to two requests. A shared 30-second cooldown also covers manual sourcing. Account fees and provider credits still depend on CJ.</p><p className="mut">Last worker check: {heartbeat?.lastSeenAt.toISOString() ?? "Not observed"}. This timestamp does not guarantee a live worker. Run <code>npm run discovery:worker</code> in the prepared environment; processes must restart after restoration. The web server alone does not execute schedules.</p></section>
    <section className="card"><h2>Add a paused schedule</h2><ActionForm action={addSchedule} label="Create paused schedule"><div className="grid"><label>Product phrase<input name="keyword" required minLength={2} maxLength={100}/></label><label>Interval in hours<input name="intervalHours" type="number" min={6} max={168} step={1} defaultValue={24} required/></label></div></ActionForm></section>
    {!jobs.length && <p>No schedules configured. No recurring catalogue requests will be made.</p>}
    {jobs.map(job => <section className="card" key={job.id}><h2>{job.keyword}</h2><p>{job.enabled ? "Enabled" : "Paused"} · Every {job.intervalHours} hours · Next eligible {job.nextRunAt.toISOString()} · Consecutive failures {job.failures}</p>{job.leaseUntil && <p className="mut">Lease expires {job.leaseUntil.toISOString()}; an expired worker is recovered with delayed retry.</p>}<ActionForm action={changeSchedule} label={job.enabled ? "Pause schedule" : "Enable schedule"}><input type="hidden" name="id" value={job.id}/><input type="hidden" name="enabled" value={String(!job.enabled)}/>{!job.enabled && <label><input type="checkbox" name="confirmed" required style={{width:"auto"}}/> Allow recurring read-only CJ requests for this phrase within the displayed limits.</label>}</ActionForm></section>)}
    <h2>Recent execution history</h2><p className="mut">Authentication failures pause a schedule immediately. Other failures back off and pause after five consecutive failures. Error categories are retained; credentials and upstream response bodies are never shown.</p>
    <div className="wrap"><table><thead><tr><th>Phrase</th><th>State</th><th>Started UTC</th><th>Result</th></tr></thead><tbody>{executions.map(run => <tr key={run.id}><td>{run.schedule.keyword}</td><td>{run.state}</td><td>{run.startedAt.toISOString()}</td><td>{run.created} new / {run.updated} changed / {run.unchanged} unchanged<div className="mut">{run.message}</div></td></tr>)}</tbody></table></div>
  </>;
}
