"use client";
import { useState } from "react";
import { parseOfferImport, type OfferImport as Batch } from "@/lib/providers/import-schema";
import { importOfferBatch } from "@/app/(protected)/research/import-actions";
import { ActionForm } from "./ActionForm";
export function OfferImport({productId,market}:{productId:number;market:{id:number;version:number;currency:string;countryCode:string|null}}){
 const [raw,setRaw]=useState(""),[preview,setPreview]=useState<Batch|null>(null),[error,setError]=useState("");
 return <details><summary>შეთავაზებების ერთიანი JSON შემოტანა — გადახედვის რიგში</summary>
 <p>მხოლოდ შენ მიერ ნებადართული წყაროდან მოპოვებული მონაცემები. ეს არ არის scraper ან საძიებო API. მაქსიმუმ 50 შეთავაზება / 200 KB. ყველა ჩანაწერი ჯერ PENDING იქნება; მიწოდება, გადასახადი და პროდუქტის მსგავსება ცალკე უნდა გადაამოწმო.</p>
 <details><summary>ფორმატი — საილუსტრაციოა, რეალური ფასები/თარიღები თავად შეავსე</summary><pre style={{overflowX:"auto"}}>{JSON.stringify({destinationCountry:market.countryCode??"US",currency:market.currency,offers:[{title:"Product title",merchant:"Seller",url:"https://example.com/product",priceMinor:1234,observedAt:"OBSERVED_UTC_ISO_DATETIME",expiresAt:"EXPIRY_WITHIN_24_HOURS"}]},null,2)}</pre></details>
 <label>JSON<textarea aria-label="შეთავაზებების JSON" rows={8} maxLength={200000} value={raw} onChange={e=>{setRaw(e.target.value);setPreview(null);setError("");}} style={{width:"100%"}}/></label>
 <button type="button" onClick={()=>{try{const b=parseOfferImport(raw);if(b.currency!==market.currency||b.destinationCountry!==market.countryCode)throw new Error("country");setPreview(b);setError("");}catch{setPreview(null);setError("შეამოწმე ფორმატი, უნიკალური URL-ები, ვალუტა/ქვეყანა და მოქმედი თარიღები.");}}}>პაკეტის გადახედვა</button>
 {error&&<p role="alert">{error}</p>}
 {preview&&<><ul>{preview.offers.map(o=><li key={o.url}>{o.title} · {o.merchant} · {preview.currency} {(o.priceMinor/100).toFixed(2)} · {o.url} · {o.observedAt} → {o.expiresAt}</li>)}</ul><p>ახალი დაკვირვება ამავე წყაროს ძველ მიღებულ შედარებას ვადას დაუსრულებს და ხელახალ გადახედვას მოითხოვს. იდენტური პაკეტი დუბლიკატს არ შექმნის.</p><ActionForm action={importOfferBatch} label="შეინახე გადახედვის რიგში"><input type="hidden" name="opportunityId" value={productId}/><input type="hidden" name="marketId" value={market.id}/><input type="hidden" name="version" value={market.version}/><input type="hidden" name="batch" value={JSON.stringify(preview)}/><label><input name="consent" type="checkbox" required/> მაქვს მონაცემების გამოყენების უფლება და გადავამოწმე წყარო/ქვეყანა/ვალუტა.</label></ActionForm></>}
 </details>;
}
