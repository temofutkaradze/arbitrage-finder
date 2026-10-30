import { ProductRefresh } from "@/components/ProductRefresh";
import {requireOwner} from "@/lib/auth/server";
import Link from "next/link";
import { validRateDate } from "@/lib/fx/reference";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/profit/format";
import { VersionedForm } from "@/components/VersionedForm";
import { ActionForm } from "@/components/ActionForm";
import { originsSchema } from "@/lib/sourcing/schema";
import { FRESH_FOR_MS } from "@/lib/sourcing/service";
import { refreshCandidate, requestShipping, applyQuote } from "./actions";

export const dynamic = "force-dynamic";
const usd = (value: number | null) => value === null ? "Unknown" : formatMoney(value, "USD");
export default async function Sourcing({ params }: { params: Promise<{ id: string }> }) {
 await requireOwner(false);
  const { id } = await params;
  const listing = /^\d+$/.test(id) ? await prisma.sourceListing.findUnique({ where: { id: Number(id) }, include: {
    variants: { where: { active: true }, orderBy: { id: "asc" }, take: 100 },
    opportunity: { include: { evaluations: { include: { market: true } } } },
  } }) : null;
  if (!listing || listing.provider !== "cj" || listing.importedVia !== "CJ_API") notFound();
  const [markets, quotes, rates] = await Promise.all([
    prisma.market.findMany({ where: { countryCode: { not: null } }, orderBy: { code: "asc" } }),
    prisma.shippingQuote.findMany({ where: { variant: { listingId: listing.id } }, include: { variant: true, market: true }, orderBy: { observedAt: "desc" }, take: 30 }),
    prisma.fxSnapshot.findMany({where:{provider:"NBG"},orderBy:[{rateDate:"desc"},{retrievedAt:"desc"}],take:60}),
  ]);
  return <>
    <Link href="/discovery">← Discovery</Link><h1>{listing.name}</h1>
    <p className="mut">Exact variant catalogue prices and provider shipping estimates. One unit per quote. No sample, supplier order or store publication is performed.</p>
    {listing.opportunityId&&<ProductRefresh listingId={listing.id}/>}
    <section className="card"><h2>Refresh variants and stock reports</h2>
      <ActionForm action={refreshCandidate} label="Refresh from CJ"><input type="hidden" name="listingId" value={listing.id}/></ActionForm>
      <p className="mut">Two read-only requests. CJ operations share a 30-second cooldown. Inventory is a provider report, not a reservation. Showing up to 100 active variants.</p>
    </section>
    {!markets.length && <p className="warn">Add a destination country to a market in <Link href="/markets">Markets</Link> to request shipping. Existing market codes are not assumed to be country codes.</p>}
    {listing.variants.length === 0 && <p>No variant details saved yet. Refresh from CJ to begin.</p>}
    {listing.variants.map((v) => {
      const origins = originsSchema.parse(v.origins), available = origins.filter((o) => (o.totalInventory ?? 0) > 0);
      const stale = new Date().getTime() - v.observedAt.getTime() >= FRESH_FOR_MS;
      return <section className="card" key={v.id}>
        <h2>{v.name}</h2><p>Variant {v.externalId} · SKU {v.sku ?? "Unknown"} · <b>{usd(v.priceMinor)}</b> / unit</p>
        <p className="mut">Observed {v.observedAt.toISOString()}{stale ? " · Refresh required (older than 24 hours)" : ""}</p>
        <ul>{origins.map((o,i) => <li key={`${o.countryCode}-${i}`}>{o.countryCode}: total {o.totalInventory ?? "unknown"}, CJ-managed {o.cjInventory ?? "unknown"}, factory {o.factoryInventory ?? "unknown"}</li>)}</ul>
        {!available.length && <p>No positive inventory report; shipping requests are unavailable until refreshed stock supports an origin.</p>}
        {!stale && available.length > 0 && markets.length > 0 && <ActionForm action={requestShipping} label="Get shipping estimates">
          <input type="hidden" name="variantId" value={v.id}/>
          <div className="grid">
            <label>Reported stock origin<select name="originCountry">{[...new Set(available.map((o) => o.countryCode))].map((code) => <option key={code}>{code}</option>)}</select></label>
            <label>Destination market<select name="marketId">{markets.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.countryCode}</option>)}</select></label>
            <label>Representative destination postal code<input name="postalCode" required maxLength={20} pattern="[A-Za-z0-9 -]+" /></label>
          </div>
          <p className="mut">Use a representative postal code; no personal address is needed. Quotes may omit remote-area, tax, clearance or other charges. Delivery estimates are not guaranteed arrival dates.</p>
        </ActionForm>}
      </section>;
    })}
    <h2>Recent route estimates</h2><p className="mut">Latest 30 estimates, all in USD. Product + shipping is a partial subtotal before any additional charges, fees, returns or advertising. The 24-hour review limit is our freshness policy, not a supplier price guarantee.</p>
    {!quotes.length && <p>No shipping estimates saved yet.</p>}
    {quotes.map((q) => {
      const evaluations = listing.opportunity?.evaluations.filter((e) => e.marketId === q.marketId) ?? [];
      const stale = q.expiresAt <= new Date() || !q.productObservedAt || new Date().getTime() - q.productObservedAt.getTime() >= FRESH_FOR_MS || !q.variant.active || q.market.countryCode !== q.destinationCountry;
      return <section className="card" key={q.id}>
        <h3>{q.market.name} · {q.originCountry} → {q.destinationCountry} {q.postalCode} · {q.method}</h3>
        <p>{q.variant.name} · one unit · Delivery estimate: {q.deliveryEstimate ?? "Unknown"} (provider text)</p>
        <div className="cards"><div><span>Product</span><b>{usd(q.productPriceMinor)}</b></div><div><span>Shipping</span><b>{usd(q.shippingMinor)}</b></div><div><span>Partial product + shipping</span><b>{q.productPriceMinor === null ? "Unknown" : usd(q.productPriceMinor + q.shippingMinor)}</b></div></div>
        <p>Provider-reported taxes: {usd(q.taxesMinor)} · Clearance: {usd(q.clearanceMinor)} · Provider total postage: {usd(q.totalPostageMinor)}</p>
        <p className="mut">Shipping observed {q.observedAt.toISOString()} · Product observed {q.productObservedAt?.toISOString() ?? "Unknown"} · Review by {q.expiresAt.toISOString()}{stale ? " · STALE / ROUTE CHANGED" : ""}</p>
        {!listing.opportunityId ? <p>Select this candidate for investigation from <Link href="/discovery">Discovery</Link>, then add a market evaluation to use an estimate.</p> : !evaluations.length ? <p><Link href={`/opportunities/${listing.opportunityId}`}>Add this market to the product evaluation</Link> to use the estimate.</p> : !stale && q.productPriceMinor !== null && <VersionedForm action={applyQuote} version={evaluations[0].version} latestUrl={`/discovery/${listing.id}`} label="Apply sourcing estimate">
          <input type="hidden" name="quoteId" value={q.id}/><input type="hidden" name="evaluationId" value={evaluations[0].id}/>
          {q.market.currency !== "USD" && <div className="grid">
            <label>FX source<select name="fxSnapshotId"><option value="">Manual rate below</option>{rates.filter(r=>r.currency===q.market.currency&&validRateDate(r.rateDate)).map(r=><option key={r.id} value={r.id}>{r.provider}: {r.rate} · {r.rateDate.toISOString().slice(0,10)}</option>)}</select></label>
            <p className="mut">Fetch official references in <Link href="/markets">Markets</Link>. Select a reference, or fill all manual fields below. Bank fees and spread remain separate costs.</p>
            <label>Manual FX: {q.market.currency} per 1 USD<input name="fxRate" inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,8})?" /></label>
            <label>FX source URL<input name="fxSource" type="url" maxLength={1000}/></label>
            <label>FX observation date (UTC, last 7 days)<input name="fxDate" type="date" max={new Date().toISOString().slice(0,10)}/></label>
          </div>}
          <label><input type="checkbox" name="confirmed" required style={{width:"auto"}}/> Replace product and shipping inputs with these estimates, and clear duty/handling inputs for a fresh tax review. I will separately account for all taxes, clearance and other charges.</label>
          <p className="mut">Selling price, payment fees, returns and CAC stay as currently entered. Unknown costs must still be researched.</p>
        </VersionedForm>}
        {listing.opportunityId && <Link href={`/opportunities/${listing.opportunityId}`}>Open product-market evaluation</Link>}
      </section>;
    })}
  </>;
}
