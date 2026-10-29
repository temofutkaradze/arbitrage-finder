import Link from "next/link";
import { requireOwner } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { matchingProposals } from "@/lib/matching/service";
import { ActionForm } from "@/components/ActionForm";
import { recordIdentity, linkListing, unlinkListing } from "./actions";
export const dynamic = "force-dynamic";
export default async function Matching({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  await requireOwner(false);
  const sp = await searchParams;
  const parsed = Number(sp.listing);
  const listingId = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  const [listings, state] = await Promise.all([
    prisma.sourceListing.findMany({ orderBy: { id: "desc" }, take: 200, include: { identity: true } }),
    listingId ? matchingProposals(listingId) : null,
  ]);
  const source = state?.source, identity = source?.identity;
  const [revisions, decisions] = source ? await Promise.all([
    prisma.identityRevision.findMany({ where: { listingId: source.id }, orderBy: { revision: "desc" }, take: 10 }),
    prisma.listingLinkDecision.findMany({ where: { listingId: source.id }, orderBy: { id: "desc" }, take: 10 }),
  ]) : [[], []];
  const latest = decisions[0];
  return <>
    <h1>Product matching</h1>
    <p>Compare supplier listings using sourced identifiers, then review the exact pack and variant before linking to existing research.</p>
    <p className="mut">Identifiers are operator-entered claims. A valid GTIN check digit does not verify its owner or prove authenticity. CJ warehouse barcodes and supplier SKUs are not automatically treated as GTINs or manufacturer part numbers. Names and images do not trigger a match.</p>
    <form method="get" className="bar"><label>Supplier listing (latest 200)<select name="listing" defaultValue={sp.listing ?? ""}><option value="">Choose a listing</option>{source && !listings.some(l => l.id === source.id) && <option value={source.id}>{source.name}</option>}{listings.map(l => <option key={l.id} value={l.id}>#{l.id} · {l.provider} · {l.name} {l.identity ? "· Identifiers recorded" : ""}</option>)}</select></label><button>Open matching</button></form>
    {listingId && !source && <p>Listing not found.</p>}
    {source && <>
      <h2>{source.name}</h2><p><a href={source.url} target="_blank" rel="noopener noreferrer">Supplier source</a> · {source.provider} · {source.externalId} · Variant {source.variantId || "not specified"}</p>
      {source.opportunityId && <p>Linked to <Link href={`/opportunities/${source.opportunityId}`}>{source.opportunity?.name}</Link>. Two existing research records cannot be merged here.</p>}
      <section className="card"><h2>Record or correct identifiers</h2>
        <p className="mut">Copy identifiers from a source you can inspect. Use the same exact variant description on both listings after checking specifications (size, colour, material, dimensions). Enter STANDARD only after confirming there are no variant differences. Blank pack or variant stays unknown. Saving preserves revision history; CJ refreshes leave these entries intact.</p>
        <ActionForm key={`${source.id}:${identity?.revision ?? 0}`} action={recordIdentity} label="Save identifiers">
          <input type="hidden" name="listingId" value={source.id}/><input type="hidden" name="revision" value={identity?.revision ?? 0}/>
          <div className="grid">
            <label>GTIN / EAN / UPC (optional)<input name="gtin" inputMode="numeric" maxLength={14} defaultValue={identity?.gtin ?? ""}/></label>
            <label>Brand<input name="brand" maxLength={200} defaultValue={identity?.brand ?? ""}/></label>
            <label>Manufacturer part number (MPN)<input name="mpn" maxLength={200} defaultValue={identity?.mpn ?? ""}/></label>
            <label>Units in the sold pack<input name="packUnits" type="number" min={1} max={10000} step={1} defaultValue={identity?.packUnits ?? ""}/></label>
            <label>Exact variant specifications<input name="variantKey" maxLength={200} defaultValue={identity?.variantKey ?? ""}/></label>
            <label>Identifier source URL<input name="sourceUrl" type="url" required maxLength={1000} defaultValue={identity?.sourceUrl ?? source.url}/></label>
            <label>Observed at (ISO UTC)<input name="observedAt" required defaultValue={identity?.observedAt.toISOString() ?? new Date().toISOString()}/></label>
          </div>
          <label>Where the identifiers appear and limitations<textarea name="note" required minLength={20} maxLength={2000} defaultValue={identity?.note ?? ""}/></label>
        </ActionForm>
      </section>
      {!source.opportunityId && <section className="card"><h2>Matches with existing research</h2>
        {!identity ? <p>Record a valid GTIN or both brand and manufacturer part number first. Record identifiers on an already selected research listing too.</p> : !state?.groups.length ? <p>No identifier matches with existing research. Add identifiers to the relevant linked listing, or select this candidate for separate research in Discovery.</p> : <>
          <p className="mut">At most 200 matching listings and their linked peers are inspected. Exceeding either bound disables linking. No confidence percentages or sales claims are inferred. Prices, currencies, quotes, evaluations and evidence are preserved.</p>
          {state.groups.map(g => <article key={g.target.opportunityId}>
            <h3><Link href={`/opportunities/${g.target.opportunityId}`}>{g.target.opportunity?.name}</Link> · {g.basis}</h3>
            {g.members.map(p => <p key={p.id}><Link href={`/matching?listing=${p.id}`}>#{p.id} · {p.provider} · {p.name}</Link> · <a href={p.identity?.sourceUrl ?? p.url} target="_blank" rel="noopener noreferrer">Identifier source</a><br/>{p.identity ? `GTIN ${p.identity.gtin ?? "unknown"} · Brand ${p.identity.brand ?? "unknown"} · MPN ${p.identity.mpn ?? "unknown"} · Pack ${p.identity.packUnits ?? "unknown"} · Variant ${p.identity.variantKey ?? "unknown"}` : "Identifiers not recorded"}</p>)}
            {!g.ready ? <ul className="warn">{g.reasons.map(r => <li key={r}>{r}</li>)}</ul> : <ActionForm action={linkListing} label="Confirm and link listing">
              <input type="hidden" name="listingId" value={source.id}/><input type="hidden" name="targetListingId" value={g.target.id}/><input type="hidden" name="expectedOpportunityId" value={g.target.opportunityId!}/><input type="hidden" name="sourceRevision" value={identity?.revision}/><input type="hidden" name="targetRevision" value={g.target.identity?.revision}/>
              <label>Comparison and remaining limitations<textarea name="note" required minLength={20} maxLength={2000}/></label>
              <label><input type="checkbox" name="confirmed" required/> I checked both sources, exact variant and pack size.</label>
            </ActionForm>}
          </article>)}
        </>}
      </section>}
      {source.opportunityId && latest?.kind === "LINK" && latest.opportunityId === source.opportunityId && <section className="card"><h2>Undo a reviewed link</h2><ActionForm action={unlinkListing} label="Undo link"><input type="hidden" name="listingId" value={source.id}/><input type="hidden" name="opportunityId" value={source.opportunityId}/><label>Reason for correction<textarea name="note" required minLength={20} maxLength={2000}/></label><label><input name="confirmed" type="checkbox" required/> Remove this listing from the research record; retain all evaluations and history. I will review any costs or evidence that relied on this listing.</label></ActionForm></section>}
      <section className="card"><h2>Review history</h2><p className="mut">Latest 10 identifier revisions and 10 link decisions. Full snapshots remain in the database.</p>{!revisions.length && !decisions.length && <p>No reviews yet.</p>}{decisions.map(d => <p key={`d${d.id}`}>{d.kind} · Research #{d.opportunityId} · {d.createdAt.toISOString()} · {d.note}</p>)}{revisions.map(r => <details key={`r${r.id}`}><summary>Identifier revision {r.revision} · {r.createdAt.toISOString()}</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(r.snapshot, null, 2)}</pre></details>)}</section>
    </>}
  </>;
}
