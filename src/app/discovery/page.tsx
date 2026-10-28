import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/profit/format";
import { ActionForm } from "@/components/ActionForm";
import { importCatalogue, discoverCatalogue, selectCandidate } from "./actions";

export const dynamic = "force-dynamic";
export default async function Discovery() {
  const [listings, runs] = await Promise.all([
    prisma.sourceListing.findMany({ orderBy: { observedAt: "desc" }, take: 100, include: { observations: { orderBy: { observedAt: "desc" }, take: 5 } } }),
    prisma.importRun.findMany({ orderBy: { completedAt: "desc" }, take: 5 }),
  ]);
  return <>
    <h1>Product discovery</h1>
    <p className="mut">A catalogue finds candidates. Demand, exact variant cost, shipping and profit still need evidence.</p>
    <section className="card"><h2>Search CJ catalogue</h2>
      <p>{process.env.CJ_ACCESS_TOKEN ? "CJ connection configured; account access is checked when searching." : "CJ is not connected yet. An account access token or API Key is required; authorised JSON import below works independently."}</p>
      <ActionForm action={discoverCatalogue} label="Discover up to 20 candidates">
        <label>Product or customer problem<input name="keyword" required maxLength={100} placeholder="Search phrase" /></label>
      </ActionForm>
      <p className="mut">One page per search; 30-second cooldown. CJ prices are USD catalogue indications, not delivered variant quotes. No orders or store changes are made.</p>
    </section>
    <section className="card"><h2>Import an authorised catalogue</h2>
      <p className="mut">Paste a JSON array from a source you are allowed to use. Prices use minor units (1234 = 12.34). Supported currencies: USD, EUR, GBP, CAD, AUD, GEL. Missing prices must be null. Maximum 100 records / 250 KB.</p>
      <details><summary>Required format (illustrative only; do not import as real research)</summary><pre style={{ overflowX: "auto" }}>{JSON.stringify([{provider:"supplier",externalId:"product-id",variantId:"variant-id",name:"Product name",url:"https://example.com/product",currency:"USD",priceMinor:null,observedAt:"2026-01-01T00:00:00Z"}], null, 2)}</pre></details>
      <ActionForm action={importCatalogue} label="Validate and import"><label>Catalogue JSON<textarea name="catalogue" required rows={8} maxLength={250000} style={{ width: "100%" }} /></label></ActionForm>
    </section>
    <h2>Latest candidates</h2><p className="mut">Showing up to 100 most recent candidates. Prices in different currencies are not ranked together. Freshness is shown; no catalogue record proves demand.</p>
    {listings.length === 0 && <p>No candidates imported yet. Connect CJ or import an authorised catalogue.</p>}
    {listings.map((l) => <section className="card" key={l.id}>
      <h2>{l.name}</h2><p><a href={l.url} rel="noopener noreferrer" target="_blank">Source record</a> · {l.importedVia === "CJ_API" ? "Received from CJ API" : "User-imported catalogue"} · {l.provider} · {l.externalId}{l.variantId && ` / ${l.variantId}`}</p>
      <p>Catalogue price: <b>{l.priceMinor === null ? "Unknown / price range" : formatMoney(l.priceMinor, l.currency)}</b> · Observed {l.observedAt.toISOString().slice(0,10)}{new Date().getTime() - l.observedAt.getTime() > 7*86400000 && <span className="sample"> · Older than 7 days — refresh before relying on it</span>}</p>
      {l.provider === "cj" && l.importedVia === "CJ_API" && <p><Link href={`/discovery/${l.id}`}>Variant prices &amp; shipping estimates</Link></p>}
      <p className="mut">Next: verify the exact variant and a delivered supplier quote, then research the target market.</p>
      <details><summary>Recent price observations</summary><ul>{l.observations.map((o) => <li key={o.id}>{o.observedAt.toISOString()} · {o.importedVia} — {o.priceMinor === null ? "Unknown" : formatMoney(o.priceMinor, o.currency)}</li>)}</ul></details>
      {l.opportunityId ? <Link href={`/opportunities/${l.opportunityId}`}>Continue research</Link> : <form action={selectCandidate}><input type="hidden" name="listingId" value={l.id}/><button>Investigate this candidate</button></form>}
    </section>)}
    <h2>Recent import activity</h2><ul>{runs.map((r) => <li key={r.id}>{r.completedAt.toISOString()} · {r.source} · {r.created} new / {r.updated} changed / {r.unchanged} unchanged</li>)}</ul>
  </>;
}
