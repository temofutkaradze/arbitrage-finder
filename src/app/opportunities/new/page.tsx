import Link from "next/link";
import { createOpportunity } from "../../actions";
import { getMarkets } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function NewOpportunity() {
  const markets = await getMarkets();
  return (
    <>
      <h1>New opportunity</h1>
      <p className="mut">Enter a product you have researched. You add costs afterwards, one market at a time.</p>
      {markets.length === 0 ? <p className="warn">Add at least one <Link href="/markets">market</Link> first.</p> : (
        <form action={createOpportunity}>
          <div className="grid">
            <label>Product name<input name="name" required /></label>
            <label>Category<input name="category" /></label>
            <label>Source marketplace<input name="sourceName" /></label>
            <label>Source listing URL<input name="sourceUrl" placeholder="https://..." /></label>
          </div>
          <label>Notes<textarea name="notes" rows={3} style={{ width: "100%" }} /></label>
          <h2>Evaluate in markets</h2>
          <div className="bar">{markets.map((m) => <label key={m.id} style={{ display: "inline" }}><input type="checkbox" name="markets" value={m.id} defaultChecked style={{ width: "auto" }} /> {m.code} ({m.currency})</label>)}</div>
          <button className="primary">Create</button>
        </form>
      )}
    </>
  );
}
