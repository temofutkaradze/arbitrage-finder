import Link from "next/link";
import {requireOwner} from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { VersionedForm } from "@/components/VersionedForm";
import { ActionForm } from "@/components/ActionForm";
import { refreshFx } from "./fx-actions";
import { validRateDate } from "@/lib/fx/reference";
import { createMarket, saveMarket } from "../form-actions";
import { getMarkets } from "@/lib/data/queries";
import { InputFields } from "@/components/InputFields";
import { CURRENCIES } from "@/lib/discovery/schema";
import { MARKET_KEYS } from "@/lib/profit/markets";
import type { Inputs } from "@/lib/profit/types";

export const dynamic = "force-dynamic";

export default async function Markets() {
 await requireOwner(false);
  const [markets,rates] = await Promise.all([getMarkets(),prisma.fxSnapshot.findMany({where:{provider:"NBG"},orderBy:[{rateDate:"desc"},{retrievedAt:"desc"}],take:30})]);
  return (
    <>
      <h1>Target markets</h1>
      <p className="mut">A market is where you sell and ship to. Its assumptions (tax, duty, fees, returns, ad cost) pre-fill new evaluations. Every value starts as Unknown. Nothing is assumed for you. Supported two-decimal currencies: USD, EUR, GBP, CAD, AUD, GEL. Tax and duty defaults need product-specific confirmation.</p>
      <section className="card"><h2>Official reference FX</h2><p className="mut">National Bank of Georgia reference rates, expressed as target currency per 1 USD. This source does not select your target market. Published future-effective rates are excluded. Reference prices do not include your bank spread or conversion fees.</p><ActionForm action={refreshFx} label="Fetch current official rates" ><span>One date-scoped request, ten-minute refresh cooldown. No API key needed.</span></ActionForm><ul>{rates.map(r=><li key={r.id}>{r.currency}: {r.rate} per USD · effective {r.rateDate.toISOString().slice(0,10)} · {validRateDate(r.rateDate)?"Within 7-day reference window":"Stale / not effective"} · <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a></li>)}</ul></section>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Add a market</h2>
        <ActionForm action={createMarket} label="Add market">
          <input name="code" placeholder="Code, e.g. US" required size={8} />
          <input name="name" placeholder="Name, e.g. United States" required />
          <input name="countryCode" placeholder="Destination country, e.g. GB" maxLength={2} pattern="[A-Za-z]{2}" aria-label="Destination country code" />
          <select name="currency" aria-label="Currency" required>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select>
          <label style={{ display: "inline" }}><input type="checkbox" name="pricesIncludeTax" style={{ width: "auto" }} /> Prices shown to customers include VAT/tax</label>

        </ActionForm>
      </section>
      {markets.length === 0 && <p className="mut">No markets yet.</p>}
      {markets.map((m) => (
        <section className="card" key={m.id}>
          <details>
            <summary><b>{m.code}</b> · {m.name} · {m.currency}</summary>
            <p><Link href={`/history?market=${m.id}`}>Market financial history</Link></p>
            <VersionedForm action={saveMarket} version={m.version} latestUrl="/markets" label="Save market assumptions">
              <input type="hidden" name="marketId" value={m.id} />
              <label>Destination country code (needed for shipping estimates)<input name="countryCode" defaultValue={m.countryCode ?? ""} maxLength={2} pattern="[A-Za-z]{2}" /></label>
              <label style={{ display: "inline" }}><input type="checkbox" name="pricesIncludeTax" defaultChecked={m.pricesIncludeTax} style={{ width: "auto" }} /> Prices include VAT/tax</label>
              <InputFields keys={MARKET_KEYS} values={(m.assumptions ?? {}) as unknown as Inputs} currency={m.currency} />
              <div className="bar"><span className="mut">Cost assumptions apply to new evaluations. Changing the destination clears applied CJ sourcing estimates for review.</span></div>
            </VersionedForm>
          </details>
        </section>
      ))}
    </>
  );
}
