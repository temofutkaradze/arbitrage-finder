import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getEvalRows } from "@/lib/data/queries";
import { formatMoney } from "@/lib/profit/format";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const [rows, recent, sampleCount] = await Promise.all([
    getEvalRows(),
    prisma.opportunity.findMany({ where: { isSample: false }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.opportunity.count({ where: { isSample: true } }),
  ]);
  const real = rows.filter((r) => !r.isSample);
  const complete = real.flatMap((r) => (r.result.complete ? [{ r, net: r.result.netProfit }] : []));
  const profitable = complete.filter((c) => c.net > 0);
  const best = new Map<string, (typeof complete)[number]>();
  for (const c of complete) { const b = best.get(c.r.currency); if (!b || c.net > b.net) best.set(c.r.currency, c); }
  const oppCount = new Set(real.map((r) => r.opportunityId)).size;
  return (
    <>
      <h1>Overview</h1>
      <p className="mut">Only data you entered is counted. Nothing here is a forecast or a guarantee of profit.</p>
      {sampleCount > 0 && <p className="sample">{sampleCount} SAMPLE item(s) exist and are excluded from every number below.</p>}
      <div className="cards">
        <div><span className="mut">Opportunities analyzed</span><b>{oppCount}</b></div>
        <div><span className="mut">Evaluations (product × market)</span><b>{real.length}</b></div>
        <div><span className="mut">With a complete profit figure</span><b>{complete.length}</b></div>
        <div><span className="mut">Profitable (net &gt; 0)</span><b>{profitable.length}</b></div>
      </div>
      <h2>Highest estimated net profit per order</h2>
      {best.size === 0 ? <p className="mut">None yet: an evaluation needs all required inputs before a profit figure is shown.</p> : (
        <ul>{[...best.entries()].map(([cur, c]) => (
          <li key={cur}><Link href={`/opportunities/${c.r.opportunityId}`}>{c.r.name}</Link> ({c.r.marketCode}): <b>{formatMoney(c.net, cur)}</b> <span className="mut">{c.r.result.quality === "verified" ? "verified inputs" : "contains estimates"}; currencies are not converted</span></li>
        ))}</ul>
      )}
      <h2>Recently added</h2>
      {recent.length === 0 ? <p className="mut">No opportunities yet. <Link href="/opportunities/new">Add one</Link> or configure a <Link href="/markets">market</Link> first.</p> : (
        <ul>{recent.map((o) => <li key={o.id}><Link href={`/opportunities/${o.id}`}>{o.name}</Link> <span className="mut">{o.createdAt.toLocaleDateString()}</span></li>)}</ul>
      )}
      <h2>Recent price changes</h2>
      <p className="mut">No price history is collected yet. Tracking begins with the first live data source (a later milestone).</p>
    </>
  );
}
