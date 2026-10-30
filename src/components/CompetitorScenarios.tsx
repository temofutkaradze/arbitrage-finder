import Link from "next/link";
import { competitorPriceScenarios, type PriceObservation } from "@/lib/research/price-scenarios";
import type { Inputs } from "@/lib/profit/types";
import { formatMoney, formatPct } from "@/lib/profit/format";
export function CompetitorScenarios({productId,rows,inputs,market}:{productId:number;rows:PriceObservation[];inputs:Inputs;market:{id:number;code:string;currency:string;pricesIncludeTax:boolean}}){
 const {groups,excluded}=competitorPriceScenarios(rows,inputs,market);
 const m=(n:number)=>formatMoney(n,market.currency);
 return <section className="card"><h3>{market.code} — კონკურენტის ფასზე ფინანსური სცენარები</h3>
 <p>შენი შენახული ხარჯები, კონკურენტების ფასებზე გადათვლით. ეს სცენარებია და არა მიღწევადი ფასის ან გაყიდვების პროგნოზი. არაფერი ინახება და მიმდინარე შეფასება არ იცვლება.</p>
 <p className="mut">ფასი = პროდუქტი + მყიდველის მიწოდება. სცენარში ეს ჯამი გამოიყენება ერთ ფასად, ცალკე shippingCharged=0; შენი მიწოდების ხარჯი უცვლელია. გამოიყენება მხოლოდ {market.currency} / tax {market.pricesIncludeTax?"INCLUDED":"EXCLUDED"} ჩანაწერები. EXACT და EQUIVALENT ცალ-ცალკეა; მედიანა მრგვალდება უმცირეს ფულად ერთეულამდე.</p>
 {!groups.length&&<p>სცენარისთვის შესადარებელი მონაცემი აკლია. საჭიროა მიმდინარე ფასი, ცნობილი მიწოდება და ბაზართან შესაბამისი ვალუტა/გადასახადის საფუძველი.</p>}
 <p className="mut">გამოიყენება გვერდზე ჩატვირთული მაქსიმუმ 100 ჩანაწერი. ამ ბაზრის ჩანაწერებიდან გამორიცხულია: {excluded}. მათ შორის შეიძლება იყოს ძველი იმავე URL-ის ჩანაწერი, მოძველებული/გაურკვეველი შედარება, უცნობი მიწოდება ან შეუსაბამო გადასახადი. შეთავაზებების ეს შერჩევა მთელი ბაზარი არ არის.</p>
 {groups.map(g=><div key={g.match}><h4>{g.match} · {g.sources.length} წყარო</h4><div className="wrap"><table><thead><tr><th>სცენარი</th><th>ფასი მიწოდებით</th><th>კონტრიბუცია რეკლამის შემდეგ</th><th>მარჟა</th><th>მონაცემების მდგომარეობა</th></tr></thead><tbody>{g.scenarios.map(s=><tr key={s.label}><td>{s.label}</td><td>{m(s.price)}</td><td>{s.result.complete?m(s.result.netProfit):"უცნობია"}</td><td>{s.result.complete?formatPct(s.result.margin):"უცნობია"}</td><td>{s.result.complete?`შეფასებითი; ${s.result.assumedZero.length} დამატებითი უცნობი ხარჯი ნულადაა ჩათვლილი`:`აკლია: ${s.result.missing.join(", ")}`}</td></tr>)}</tbody></table></div>
 <details><summary>სცენარის წყაროები</summary><ul>{g.sources.map(s=><li key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">#{s.id}</a> · {m(s.priceMinor+s.shippingMinor!)} · {s.observedAt.toISOString().slice(0,10)}</li>)}</ul></details></div>)}
 <p className="mut">კონტრიბუცია არ მოიცავს ფიქსირებულ ბიზნესხარჯებსა და საშემოსავლო გადასახადს. შენი მოდელის სხვა უცნობები და შეფასებითი ხარჯები ძალაში რჩება.</p>
 <Link href={`/research?product=${productId}&market=${market.id}`}>გადაამოწმე ან დაამატე კონკურენტის შეთავაზება</Link>
 </section>;
}
