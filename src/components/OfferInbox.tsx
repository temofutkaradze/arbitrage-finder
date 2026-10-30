import {ebayConnectionMode} from "@/lib/providers/ebay-auth";
import { OfferImport } from "./OfferImport";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { ActionForm } from "./ActionForm";
import { fetchOffers, reviewExternalOffer } from "@/app/(protected)/research/offer-actions";
export async function OfferInbox({productId,marketId,query,before}:{productId:number;marketId:number;query:string;before?:number}){
 const market=await prisma.market.findUniqueOrThrow({where:{id:marketId}});
 const records=await prisma.externalOffer.findMany({where:{opportunityId:productId,marketId,...(before?{id:{lt:before}}:{})},orderBy:{id:"desc"},take:41});
 const offers=records.slice(0,40);
 return <section className="card"><h2>External offers awaiting comparison</h2><p className="mut">Optional eBay Browse connector: {ebayConnectionMode()==="oauth"?"automatic application tokens configured; access checked when searching":ebayConnectionMode()==="manual"?"manual token configured; replace it securely when expired":"not connected — configure production App ID and Cert ID securely"}. One page, up to 20 offers, one-minute cooldown. No scraping or scheduled eBay collection. Manual competitor entry below remains available.</p><ActionForm action={fetchOffers} label="Find eBay offers"><input type="hidden" name="opportunityId" value={productId}/><input type="hidden" name="marketId" value={marketId}/><label>Search phrase<input name="query" minLength={2} maxLength={100} defaultValue={query.slice(0,100)} required/></label></ActionForm><p className="mut">Marketplace and delivery country follow your configured market. Delivery availability, shipping and taxes still need confirmation. An active listing is not proof of sales. Re-fetching an offer expires its previous accepted observation and requires a new review.</p>
 <OfferImport productId={productId} market={market}/>
 {offers.map(o=><article key={o.id} style={{borderTop:"1px solid var(--line)",padding:"12px 0"}}><a href={o.url} target="_blank" rel="noopener noreferrer">{o.title}</a><p>{o.provider} · {o.merchant} · {o.currency} {(o.priceMinor/100).toFixed(2)} · {o.state} · {o.expiresAt<=new Date()?"EXPIRED":"Within recorded expiry"}</p><p className="mut">Observed {o.observedAt.toISOString()} · {o.destinationCountry}</p>
 {o.state==="PENDING"&&o.expiresAt>new Date()&&<ActionForm action={reviewExternalOffer} label="Save comparison review"><input type="hidden" name="id" value={o.id}/><div className="grid"><label>Decision<select name="decision"><option value="REJECT">Reject / not comparable</option><option value="ACCEPT">Accept as a price observation</option></select></label><label>Match if accepted<select name="match"><option>EQUIVALENT</option><option>EXACT</option></select></label><label>Confirmed shipping (minor units; blank = unknown)<input name="shippingMinor" type="number" min={0} step={1}/></label><label>Tax basis<select name="taxBasis"><option>UNKNOWN</option><option>INCLUDED</option><option>EXCLUDED</option></select></label></div><label>Explain model, dimensions, pack size, condition, delivery and limitations<textarea name="comparison" minLength={20} maxLength={1800} required style={{width:"100%"}}/></label></ActionForm>}
 {o.reviewNote&&<p className="mut">Review: {o.reviewNote}</p>}</article>)}
 <p className="mut">Showing up to 40 saved offers per page, by record ID. Updated records keep their original ID.</p>
 {before&&<p><Link href={`/research?product=${productId}&market=${marketId}`}>შეთავაზებების პირველი გვერდი</Link></p>}
 {records.length>40&&<p><Link href={`/research?product=${productId}&market=${marketId}&offerBefore=${offers.at(-1)!.id}`}>შემდეგი შეთავაზებები →</Link></p>}
 {!offers.length&&<p>No external offers saved for this product-market combination.</p>}</section>;
}
