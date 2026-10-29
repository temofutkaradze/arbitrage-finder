import {requireOwner} from "@/lib/auth/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addEvaluation, deleteOpportunity, saveEvaluation } from "../../actions";
import { getMarkets, getOpportunity } from "@/lib/data/queries";
import { formatMoney, formatPct, toDisplay } from "@/lib/profit/format";
import { INPUT_DEFS, INPUT_KEYS, type InputKey } from "@/lib/profit/types";
import { Badge, Quality } from "@/components/Badge";
import { InputFields } from "@/components/InputFields";
import { ActionForm } from "@/components/ActionForm";
import { addEvidence } from "../evidence-actions";
import { EVIDENCE_KINDS, PROVENANCE, researchReadiness } from "@/lib/research/readiness";
import { calculateBeforeAds } from "@/lib/profit/before-ads";
import { Calculator } from "@/components/Calculator";

export const dynamic = "force-dynamic";
const label = (k: InputKey) => INPUT_DEFS.find((d) => d.key === k)!.label;

export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
 await requireOwner(false);
  const { id } = await params;
  const opp = /^\d+$/.test(id) ? await getOpportunity(Number(id)) : null;
  if (!opp) notFound();
  const markets = await getMarkets();
  const unused = markets.filter((m) => !opp.evaluations.some((e) => e.market.id === m.id));
  return (
    <>
      <h1>{opp.name}{opp.isSample && <span className="sample"> SAMPLE</span>}</h1>
      <p className="mut">{[opp.category, opp.sourceName].filter(Boolean).join(" · ")}
        {opp.sourceUrl && <> · <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer">Source listing</a></>}</p>
      <p><a href={`/opportunities/${opp.id}/report`} download>Download research report (.txt)</a> · <span className="mut">Current inputs, calculations, sources and evidence. Review private notes before sharing.</span></p>
      {opp.notes && <p>{opp.notes}</p>}
      <p className="mut">Research records below distinguish observed claims, provider estimates and assumptions. Supplier identifier matching is available in Matching. Automated demand research is not connected yet.</p>

      {opp.evaluations.map((e) => {
        const c = e.result; const research = researchReadiness(opp.evidence, e.market.id); const beforeAds = calculateBeforeAds(e.inputs, { pricesIncludeTax: e.market.pricesIncludeTax }); const cur = e.market.currency; const m = (n: number) => formatMoney(n, cur);
        const initial = Object.fromEntries(INPUT_DEFS.map((d) => [d.key, toDisplay(d.unit, e.inputs[d.key]?.value)])) as Record<InputKey, string>;
        return (
          <section className="card" key={e.id}>
            <h2 style={{ marginTop: 0 }}>{e.market.code} · {e.market.name} <Quality q={c.quality} /></h2>
            <p><b>{research.label}</b> · {research.next}</p>
            {research.missing.length > 0 && <p className="mut">Evidence still needed: {research.missing.join(", ").toLowerCase().replaceAll("_", " ")}</p>}
            {!c.complete && beforeAds && <div className="warn">Before advertising: {m(beforeAds.contribution)} / order. Break-even CAC: {beforeAds.contribution > 0 ? m(beforeAds.contribution) : "No positive ad budget"}. Advertising profit remains unknown. {beforeAds.assumedZero.length} optional inputs assumed zero; {beforeAds.estimatedKeys.length} inputs estimated.</div>}
            {!c.complete ? (
              <p className="warn">No profit figure: missing required inputs: {c.missing.map(label).join("; ")}. Fill them in below (mark as Estimate or Verified).</p>
            ) : (
              <>
                <div className="cards">
                  <div><span className="mut">Contribution after ads / order</span><b className={c.netProfit >= 0 ? "pos" : "neg"}>{m(c.netProfit)}</b></div>
                  <div><span className="mut">Margin</span><b>{formatPct(c.margin)}</b></div>
                  <div><span className="mut">Return on capital</span><b>{formatPct(c.roi)}</b></div>
                  <div><span className="mut">Capital per order</span><b>{m(c.capitalPerOrder)}</b></div>
                  <div><span className="mut">Capital, first purchase</span><b>{c.batchCapital === null ? "units not set" : m(c.batchCapital)}</b></div>
                  <div><span className="mut">Max affordable CAC</span><b>{m(c.maxAffordableCac)}</b></div>
                  <div><span className="mut">Break-even ROAS</span><b>{c.breakEvenRoas === null ? "n/a" : c.breakEvenRoas.toFixed(2) + "x"}</b></div>
                  <div><span className="mut">Break-even price</span><b>{c.breakEvenPrice === null ? "n/a" : m(c.breakEvenPrice)}</b></div>
                </div>
                {c.assumedZero.length > 0 && <p className="warn">Counted as zero because Unknown: {c.assumedZero.map(label).join("; ")}. Real costs may be higher.</p>}
                <div className="wrap"><table>
                  <thead><tr><th>Profit breakdown (per order)</th><th>Amount</th><th>Data</th></tr></thead>
                  <tbody>
                    {c.lines.map((l) => <tr key={l.label}><td className="l">{l.label}</td><td className={l.amount > 0 ? "pos" : ""}>{m(l.amount)}</td><td><Badge status={l.status} /></td></tr>)}
                    <tr><td className="l"><b>Contribution after ads</b></td><td><b>{m(c.netProfit)}</b></td><td><Badge status="CALCULATED" /></td></tr>
                  </tbody>
                </table></div>
                <h3>Advertising-cost scenarios</h3>
                <div className="wrap"><table>
                  <thead><tr><th>Scenario</th><th>Ad cost / order</th><th>Contribution after ads</th><th>Margin</th></tr></thead>
                  <tbody>{c.scenarios.map((s) => <tr key={s.label}><td className="l">{s.label}</td><td>{m(s.cac)}</td><td className={s.netProfit >= 0 ? "pos" : "neg"}>{m(s.netProfit)}</td><td>{formatPct(s.margin)}</td></tr>)}</tbody>
                </table></div>
                <p className="mut">Simplifications: import VAT is not modeled separately; duty is charged on supplier price + shipping; “unrecovered cost per return” should include everything lost per return.</p>
              </>
            )}
            <details open={!c.complete}>
              <summary>Edit inputs</summary>
              <form action={saveEvaluation}>
                <input type="hidden" name="evaluationId" value={e.id} />
                <InputFields keys={INPUT_KEYS} values={e.inputs} currency={cur} />
                <div className="bar"><button className="primary">Save inputs</button><span className="mut">* required for a profit figure. A number left on “Unknown” is saved as an Estimate.</span></div>
              </form>
            </details>
            <details><summary>What-if calculator</summary><Calculator initial={initial} pricesIncludeTax={e.market.pricesIncludeTax} currency={cur} /></details>
          </section>
        );
      })}

      <section className="card"><h2>Research evidence</h2>
        <p className="mut">A record is a claim with a source, not a guarantee. Scope demand, competition and shipping to a market. Choose an expiry appropriate to how quickly the claim can change. Dates are UTC.</p>
        {opp.evidence.length === 0 && <p>No evidence recorded yet.</p>}
        {opp.evidence.map((item) => <article key={item.id} style={{ borderBottom: "1px solid var(--line)", padding: "10px 0" }}>
          <b>{item.kind.replaceAll("_", " ")}</b>{item.resolvedAt && <span className="mut"> · RETIRED: {item.resolutionNote}</span>} · {item.provenance} · {item.outcome} · {item.marketId ? markets.find((m) => m.id === item.marketId)?.code : "Global"}
          <p>{item.summary}</p><a href={item.url} target="_blank" rel="noopener noreferrer">Source</a>
          <span className="mut"> · Observed {item.observedAt.toISOString().slice(0,10)} · Expires {item.expiresAt.toISOString().slice(0,10)}{item.expiresAt < new Date() ? " · EXPIRED" : ""}</span>
        </article>)}
        <details><summary>Record evidence or an assumption</summary><ActionForm action={addEvidence} label="Save research record">
          <input type="hidden" name="opportunityId" value={opp.id}/>
          <div className="grid">
            <label>Topic<select name="kind">{EVIDENCE_KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label>Origin<select name="provenance">{PROVENANCE.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label>Outcome<select name="outcome"><option>INCONCLUSIVE</option><option>SUPPORTS</option><option>CONCERN</option></select></label>
            <label>Market<select name="marketId"><option value="">Global / not market-specific</option>{markets.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}</select></label>
            <label>Observed date (UTC)<input type="date" name="observedAt" required max={new Date().toISOString().slice(0,10)}/></label>
            <label>Expiry date (UTC)<input type="date" name="expiresAt" required/></label>
          </div>
          <label>Source or internal assumption document URL<input type="url" name="url" required maxLength={1000}/></label>
          <label>What the source supports, and what remains unknown<textarea name="summary" required minLength={10} maxLength={2000} rows={3} style={{width:"100%"}}/></label>
        </ActionForm></details>
      </section>
      {unused.length > 0 && (
        <form action={addEvaluation} className="bar">
          <input type="hidden" name="opportunityId" value={opp.id} />
          <select name="marketId">{unused.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}</select>
          <button>Evaluate in another market</button>
        </form>
      )}
      <form action={deleteOpportunity} className="bar">
        <input type="hidden" name="opportunityId" value={opp.id} />
        <button>Delete this opportunity</button> <Link href="/opportunities">Back to list</Link>
      </form>
    </>
  );
}
