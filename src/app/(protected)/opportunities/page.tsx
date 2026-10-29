import {requireOwner} from "@/lib/auth/server";
import Link from "next/link";
import { getEvalRows, getMarkets } from "@/lib/data/queries";
import { formatMoney, formatPct } from "@/lib/profit/format";
import { compareOpportunities, decisionLabel } from "@/lib/research/ranking";
import { Quality } from "@/components/Badge";

export const dynamic = "force-dynamic";
type SP = { market?: string; minProfit?: string; minMargin?: string; hideIncomplete?: string; sort?: string };

export default async function Opportunities({ searchParams }: { searchParams: Promise<SP> }) {
 await requireOwner(false);
  const sp = await searchParams;
  const [all, markets] = await Promise.all([getEvalRows(), getMarkets()]);
  const minProfit = sp.minProfit ? Math.round(Number(sp.minProfit) * 100) : null;
  const minMargin = sp.minMargin ? Number(sp.minMargin) / 100 : null;
  const sort = sp.sort === "margin" || sp.sort === "roi" ? sp.sort : "net";
  const rows = all
    .filter((r) => !sp.market || r.marketCode === sp.market)
    .filter((r) => sp.hideIncomplete !== "on" || r.result.complete)
    .filter((r) => minProfit === null || (r.result.complete && r.result.netProfit >= minProfit))
    .filter((r) => minMargin === null || (r.result.complete && (r.result.margin ?? -1) >= minMargin))
    .sort((a, b) => compareOpportunities(a, b, sort));
  return (
    <>
      <h1>Opportunities</h1>
      <p className="mut">Grouped by currency, then research readiness and the selected metric. Contribution after ads excludes fixed business overhead and income tax. Incomplete evaluations are marked missing economics. Minimum contribution uses each row’s local currency. Research evidence is recorded on each product.</p>
      <form className="bar" method="get">
        <select name="market" defaultValue={sp.market ?? ""}><option value="">All markets</option>{markets.map((m) => <option key={m.id} value={m.code}>{m.code}</option>)}</select>
        <input name="minProfit" placeholder="Min contribution after ads" defaultValue={sp.minProfit} size={12} />
        <input name="minMargin" placeholder="Min margin %" defaultValue={sp.minMargin} size={12} />
        <label style={{ display: "inline" }}><input type="checkbox" name="hideIncomplete" defaultChecked={sp.hideIncomplete === "on"} style={{ width: "auto" }} /> Hide incomplete</label>
        <select name="sort" defaultValue={sort}><option value="net">Sort: contribution after ads</option><option value="margin">Sort: margin</option><option value="roi">Sort: return on capital</option></select>
        <button className="primary">Apply</button><Link href="/opportunities/new">+ New opportunity</Link>
      </form>
      <div className="wrap"><table>
        <thead><tr><th>Product</th><th>Market</th><th>Price</th><th>Total cost</th><th>Contribution after ads</th><th>Margin</th><th>Return on capital</th><th>Research decision</th><th>Data quality</th><th>Updated</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={10} className="mut">Nothing to show yet.</td></tr>}
          {rows.map((r) => {
            const c = r.result;
            return (
              <tr key={r.id}>
                <td className="l"><Link href={`/opportunities/${r.opportunityId}`}>{r.name}</Link>{r.isSample && <span className="sample"> SAMPLE</span>}<div className="mut">{[r.category, r.sourceName].filter(Boolean).join(" · ")}</div></td>
                <td>{r.marketCode}</td>
                <td>{r.price === null ? "n/a" : formatMoney(r.price, r.currency)}</td>
                <td>{c.complete ? formatMoney(c.totalCost, r.currency) : "n/a"}</td>
                <td className={c.complete ? (c.netProfit >= 0 ? "pos" : "neg") : ""}>{c.complete ? formatMoney(c.netProfit, r.currency) : "n/a"}</td>
                <td>{c.complete ? formatPct(c.margin) : "n/a"}</td>
                <td>{c.complete ? formatPct(c.roi) : "n/a"}</td>
                <td title={r.research.next}>{decisionLabel(r)}<div className="mut">{r.research.missing.length} evidence topics missing{c.complete && c.assumedZero.length > 0 ? ` / ${c.assumedZero.length} inputs assumed zero` : ""}</div></td>
                <td><Quality q={c.quality} />{!c.complete && <div className="mut">{c.missing.length} required input(s) missing</div>}</td>
                <td className="mut">{r.updatedAt.toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </>
  );
}
