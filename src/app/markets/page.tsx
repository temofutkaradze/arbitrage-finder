import { createMarket, saveMarket } from "../actions";
import { getMarkets } from "@/lib/data/queries";
import { InputFields } from "@/components/InputFields";
import { MARKET_KEYS } from "@/lib/profit/markets";
import type { Inputs } from "@/lib/profit/types";

export const dynamic = "force-dynamic";

export default async function Markets() {
  const markets = await getMarkets();
  return (
    <>
      <h1>Target markets</h1>
      <p className="mut">A market is where you sell and ship to. Its assumptions (tax, duty, fees, returns, ad cost) pre-fill new evaluations. Every value starts as Unknown. Nothing is assumed for you. Currencies with 2 decimals only.</p>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Add a market</h2>
        <form action={createMarket} className="bar">
          <input name="code" placeholder="Code, e.g. US" required size={8} />
          <input name="name" placeholder="Name, e.g. United States" required />
          <input name="currency" placeholder="USD" required size={5} />
          <label style={{ display: "inline" }}><input type="checkbox" name="pricesIncludeTax" style={{ width: "auto" }} /> Prices shown to customers include VAT/tax</label>
          <button className="primary">Add market</button>
        </form>
      </section>
      {markets.length === 0 && <p className="mut">No markets yet.</p>}
      {markets.map((m) => (
        <section className="card" key={m.id}>
          <details>
            <summary><b>{m.code}</b> · {m.name} · {m.currency}</summary>
            <form action={saveMarket}>
              <input type="hidden" name="marketId" value={m.id} />
              <label style={{ display: "inline" }}><input type="checkbox" name="pricesIncludeTax" defaultChecked={m.pricesIncludeTax} style={{ width: "auto" }} /> Prices include VAT/tax</label>
              <InputFields keys={MARKET_KEYS} values={(m.assumptions ?? {}) as unknown as Inputs} currency={m.currency} />
              <div className="bar"><button className="primary">Save market assumptions</button><span className="mut">Applies to evaluations created afterwards, not existing ones.</span></div>
            </form>
          </details>
        </section>
      ))}
    </>
  );
}
