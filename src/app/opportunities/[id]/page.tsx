import Link from "next/link";
import { notFound } from "next/navigation";
import { addEvaluation, deleteOpportunity, saveEvaluation } from "../../actions";
import { getMarkets, getOpportunity } from "@/lib/data/queries";
import { formatMoney, formatPct, toDisplay } from "@/lib/profit/format";
import { INPUT_DEFS, INPUT_KEYS, type InputKey } from "@/lib/profit/types";
import { Badge, Quality } from "@/components/Badge";
import { InputFields } from "@/components/InputFields";
import { Calculator } from "@/components/Calculator";

export const dynamic = "force-dynamic";
const label = (k: InputKey) => INPUT_DEFS.find((d) => d.key === k)!.label;

export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
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
      {opp.notes && <p>{opp.notes}</p>}
      <p className="mut">Not collected yet (later milestones): price history, competing listings, demand evidence, match confidence, risk assessment, AI analysis.</p>

      {opp.evaluations.map((e) => {
        const c = e.result; const cur = e.market.currency; const m = (n: number) => formatMoney(n, cur);
        const initial = Object.fromEntries(INPUT_DEFS.map((d) => [d.key, toDisplay(d.unit, e.inputs[d.key]?.value)])) as Record<InputKey, string>;
        return (
          <section className="card" key={e.id}>
            <h2 style={{ marginTop: 0 }}>{e.market.code} · {e.market.name} <Quality q={c.quality} /></h2>
            {!c.complete ? (
              <p className="warn">No profit figure: missing required inputs: {c.missing.map(label).join("; ")}. Fill them in below (mark as Estimate or Verified).</p>
            ) : (
              <>
                <div className="cards">
                  <div><span className="mut">Net profit / order</span><b className={c.netProfit >= 0 ? "pos" : "neg"}>{m(c.netProfit)}</b></div>
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
                    <tr><td className="l"><b>Net profit</b></td><td><b>{m(c.netProfit)}</b></td><td><Badge status="CALCULATED" /></td></tr>
                  </tbody>
                </table></div>
                <h3>Advertising-cost scenarios</h3>
                <div className="wrap"><table>
                  <thead><tr><th>Scenario</th><th>Ad cost / order</th><th>Net profit</th><th>Margin</th></tr></thead>
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
