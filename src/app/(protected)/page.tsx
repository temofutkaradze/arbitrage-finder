import {requireOwner} from "@/lib/auth/server";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getEvalRows } from "@/lib/data/queries";
import { formatMoney } from "@/lib/profit/format";

export const dynamic = "force-dynamic";

export default async function Overview() {
 await requireOwner(false);
  const [rows, recent, sampleCount, candidateCount] = await Promise.all([
    getEvalRows(),
    prisma.opportunity.findMany({ where: { isSample: false }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.opportunity.count({ where: { isSample: true } }),
    prisma.sourceListing.count({ where: { opportunityId: null } }),
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
      <section className="card"><h2>პროდუქტის კვლევის გზა</h2><ol><li><Link href="/discovery">Discovery</Link> — მოძებნე კანდიდატი და აირჩიე Investigate this candidate.</li><li><Link href="/products">ჩემი პროდუქტები</Link> — გახსენი შენახული პროდუქტი, შეაგროვე წყაროები და შეამოწმე ვარიანტი და მიწოდება.</li><li><Link href="/research">Research</Link> — შეადარე კონკურენტები შენ მიერ არჩეულ ბაზარზე.</li><li><Link href="/opportunities">შეფასებები</Link> — შეავსე ხარჯები და შეადარე ეკონომიკა. უცნობი მონაცემი დადასტურებული მოგება არ არის.</li></ol><p className="mut">საწყისი GE / US კვლევა ცალკე მომზადებული მაგალითია. ავტომატური კანდიდატების ძიება იმართება Automation-იდან; სრული მოთხოვნისა და მოგების ავტომატური კვლევა ჯერ არ არის დაკავშირებული.</p></section>
      <p className="mut">Only saved evaluations are counted. Contribution after ads excludes fixed overhead and income tax. Nothing here is a forecast or a guarantee of profit.</p>
      {sampleCount > 0 && <p className="sample">{sampleCount} SAMPLE item(s) exist and are excluded from every number below.</p>}
      <p><Link href="/discovery">{candidateCount} catalogue candidates awaiting research</Link>. Catalogue entries are excluded from profit metrics until evaluated.</p>
      <div className="cards">
        <div><span className="mut">Opportunities analyzed</span><b>{oppCount}</b></div>
        <div><span className="mut">Evaluations (product × market)</span><b>{real.length}</b></div>
        <div><span className="mut">With a complete profit figure</span><b>{complete.length}</b></div>
        <div><span className="mut">Profitable (net &gt; 0)</span><b>{profitable.length}</b></div>
      </div>
      <h2>Highest estimated contribution after ads per order</h2>
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
      <p className="mut">Catalogue price observations are available on each candidate in Discovery. This overview does not aggregate price changes.</p>
    </>
  );
}
