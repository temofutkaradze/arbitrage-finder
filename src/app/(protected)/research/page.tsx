import { notFound } from "next/navigation";
import { CompetitorScenarios } from "@/components/CompetitorScenarios";
import { rowsToInputs } from "@/lib/data/queries";
import {requireOwner} from "@/lib/auth/server";
import { OfferInbox } from "@/components/OfferInbox";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getEvalRows } from "@/lib/data/queries";
import { decisionLabel, compareOpportunities } from "@/lib/research/ranking";
import { comparisonGroups, researchLinks } from "@/lib/research/competitors";
import { ActionForm } from "@/components/ActionForm";
import { recordCompetitor, resolveEvidence } from "./actions";
export const dynamic="force-dynamic";
export default async function Research({searchParams}:{searchParams:Promise<{product?:string;market?:string;offerBefore?:string}>}){
 await requireOwner(false);
 const sp=await searchParams;
 const offerBefore=sp.offerBefore===undefined?undefined:Number(sp.offerBefore);
 if(offerBefore!==undefined&&(!/^[1-9]\d*$/.test(sp.offerBefore!)||!Number.isSafeInteger(offerBefore)||offerBefore>2147483647))notFound();
 const [products,markets,rows]=await Promise.all([
  prisma.opportunity.findMany({where:{isSample:false},orderBy:{createdAt:"desc"},take:100}),prisma.market.findMany({orderBy:{code:"asc"}}),getEvalRows(),
 ]);
 const productId=sp.product&&/^[1-9]\d*$/.test(sp.product)?Number(sp.product):null;
 const product=productId&&Number.isSafeInteger(productId)&&productId<=2147483647?await prisma.opportunity.findFirst({where:{id:productId,isSample:false}}):null;
 const market=markets.find(m=>String(m.id)===sp.market);
 const selectable=product&&!products.some(p=>p.id===product.id)?[product,...products]:products;
 const [observations,evidence]=product?await Promise.all([
  prisma.competitorObservation.findMany({where:{opportunityId:product.id,...(market?{marketId:market.id}:{})},include:{market:true},orderBy:{observedAt:"desc"},take:100}),
  prisma.evidence.findMany({where:{opportunityId:product.id},orderBy:{createdAt:"desc"},take:100}),
 ]):[[],[]];
 const evaluation=product&&market?await prisma.evaluation.findUnique({where:{opportunityId_marketId:{opportunityId:product.id,marketId:market.id}},include:{inputs:true}}):null;
 const links=product?researchLinks(product.name,market?.countryCode):null;
 return <>
  <h1>Research workbench</h1><p><Link href="/products">ჩემი პროდუქტები — სრული სია</Link>. ეს სივრცე არჩეული პროდუქტის კვლევას ინახავს; საწყისი GE / US მაგალითი ცალკე გვერდია.</p><p className="mut">Evidence first. A listing price, search trend or active ad does not prove sales or profitable acquisition. Demand evidence requires research. Optional eBay offers require account access and human comparison.</p>
  <form method="get" className="bar"><label>Product<select name="product" defaultValue={sp.product??""}><option value="">Choose a product</option>{selectable.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Market<select name="market" defaultValue={sp.market??""}><option value="">No market selected</option>{markets.map(m=><option key={m.id} value={m.id}>{m.name} · {m.currency}</option>)}</select></label><button>Open research</button></form>
  {!products.length&&<p>Select a real candidate for investigation in <Link href="/discovery">Discovery</Link> to begin. Markets remain your choice.</p>}
  {product&&<><h2>{product.name}</h2><p><Link href={`/opportunities/${product.id}`}>Economics and evidence entry</Link></p>
   {links&&<section className="card"><h2>Research sources</h2><div className="bar"><a href={links.ebay} target="_blank" rel="noopener noreferrer">Search comparable listings</a><a href={links.trends} target="_blank" rel="noopener noreferrer">Google Trends</a><a href={links.meta} target="_blank" rel="noopener noreferrer">Meta Ad Library</a><a href={links.tiktok} target="_blank" rel="noopener noreferrer">TikTok Creative Center</a></div><p className="mut">These open official research tools; no data is imported. Set country and date filters in each source. eBay.com results are not automatically scoped to your market. Check access and reuse rights.</p><ol><li>Compare exact model, material, dimensions, pack size, delivery and returns. Explain any mismatch.</li><li>Record the trend period and region; label stable, growing, seasonal or unknown only when the evidence supports it.</li><li>Describe the customer problem and a demonstrable benefit. Record ad examples without inferring spend, CAC or conversion.</li><li>Investigate quality, compliance, IP, shipping and return concerns. Retire superseded records with a reason.</li></ol></section>}
   {market&&<OfferInbox productId={product.id} marketId={market.id} query={product.name} before={offerBefore}/>}
   {market&&evaluation&&<CompetitorScenarios productId={product.id} rows={observations} inputs={rowsToInputs(evaluation.inputs)} market={market}/>}
   {market&&!evaluation&&<p><Link href={`/opportunities/${product.id}#add-market`}>დაამატე ამ ბაზრის ფინანსური შეფასება კონკურენტის ფასზე სცენარების სანახავად</Link></p>}
   <section className="card"><h2>Competitor observations</h2><p className="mut">Showing up to 100 observations. Multiple observations may come from the same seller; counts are not a market-wide competition census. Prices are not copied into your selling-price assumptions.</p>
    {!market&&<p>Select a market to record observations or calculate comparable price summaries.</p>}
    {market&&comparisonGroups(observations.filter(o=>o.marketId===market.id)).map(g=><p key={g.basis}>{g.basis}: {g.count} comparable observations · product + shipping range {(g.min/100).toFixed(2)}–{(g.max/100).toFixed(2)} · median {(g.median/100).toFixed(2)}. Other charges may apply.</p>)}
    {observations.map(o=><article key={o.id}><p><a href={o.url} target="_blank" rel="noopener noreferrer">{o.merchant}</a> · {o.market.code} · {o.match} · {o.currency} {(o.priceMinor/100).toFixed(2)} + shipping {o.shippingMinor===null?"Unknown":(o.shippingMinor/100).toFixed(2)} · tax {o.taxBasis} · {o.expiresAt<=new Date()?"EXPIRED":"Recorded"}</p><p className="mut">{o.comparison} · Observed {o.observedAt.toISOString().slice(0,10)} · Expires {o.expiresAt.toISOString().slice(0,10)}</p></article>)}
    {market&&<details><summary>Record a displayed competitor offer</summary><ActionForm action={recordCompetitor} label="Save observation"><input type="hidden" name="opportunityId" value={product.id}/><input type="hidden" name="marketId" value={market.id}/><input type="hidden" name="currency" value={market.currency}/><div className="grid"><label>Merchant<input name="merchant" required maxLength={100}/></label><label>Source URL<input name="url" type="url" required maxLength={1000}/></label><label>Match<select name="match"><option>UNCERTAIN</option><option>EXACT</option><option>EQUIVALENT</option></select></label><label>Tax basis<select name="taxBasis"><option>UNKNOWN</option><option>INCLUDED</option><option>EXCLUDED</option></select></label><label>Product price ({market.currency}, minor units)<input name="priceMinor" type="number" min={1} step={1} required/></label><label>Shipping (minor units; blank = unknown)<input name="shippingMinor" type="number" min={0} step={1}/></label><label>Observed UTC date<input name="observedAt" type="date" required/></label><label>Expiry UTC date<input name="expiresAt" type="date" required/></label></div><label>Explain model/size/pack match, delivery, returns and limitations<textarea name="comparison" required minLength={20} maxLength={2000} style={{width:"100%"}}/></label></ActionForm></details>}
   </section>
   <section className="card"><h2>Evidence history and corrections</h2>{!evidence.length&&<p>No evidence recorded. Use the product detail page to record sourced claims and assumptions.</p>}{evidence.map(e=><article key={e.id}><p><b>{e.kind}</b> · {e.provenance} · {e.outcome} · {e.resolvedAt?"RETIRED":e.expiresAt<=new Date()?"EXPIRED":"Current"}</p><p>{e.summary}</p><a href={e.url} target="_blank" rel="noopener noreferrer">Source</a>{e.resolvedAt?<p className="mut">Retired {e.resolvedAt.toISOString()}: {e.resolutionNote}</p>:<details><summary>Retire or correct this record</summary><ActionForm action={resolveEvidence} label="Retire with explanation"><input type="hidden" name="id" value={e.id}/><label>Resolution or correction<textarea name="note" required minLength={20} maxLength={2000}/></label></ActionForm></details>}</article>)}</section>
  </>}
  <h2>Investigation shortlist</h2><p className="mut">Up to 100 most recently added products are selectable above. Financial decisions below include evaluated non-sample products, grouped by currency; no market is selected for you.</p>
  {products.filter(p=>!rows.some(r=>r.opportunityId===p.id)).map(p=><p key={p.id}><Link href={`/research?product=${p.id}`}>{p.name}</Link> · Not evaluated — choose a market when ready.</p>)}
  {rows.filter(r=>!r.isSample).sort((a,b)=>compareOpportunities(a,b,"net")).map(r=><section className="card" key={r.id}><Link href={`/research?product=${r.opportunityId}&market=${markets.find(m=>m.code===r.marketCode)?.id??""}`}>{r.name} · {r.marketCode}</Link><p><b>{decisionLabel(r)}</b> · {r.research.next}</p><p className="mut">{r.result.complete?`${r.currency} ${(r.result.netProfit/100).toFixed(2)} contribution after ads; ${r.result.assumedZero.length} optional inputs assumed zero`:`Missing cost inputs: ${r.result.missing.join(", ")}`}</p></section>)}
 </>;
}
