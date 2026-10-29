import Link from "next/link";
import type { SupplierProgressData } from "@/lib/sourcing/progress";
import { quoteUsability, REPORT_FRESH_MS } from "@/lib/sourcing/progress-status";
import { originsSchema } from "@/lib/sourcing/schema";
const date = (d: Date) => new Intl.DateTimeFormat("ka-GE", { timeZone: "Asia/Tbilisi", dateStyle: "short", timeStyle: "short" }).format(d);
export function SupplierProgress({ productId, data }: { productId: number; data: SupplierProgressData }) {
  const listings = data.listings.filter(l => l.opportunityId === productId);
  if (!listings.length) return <p className="mut">CJ API-ის დაკავშირებული ჩანაწერი არ არის. <Link href="/discovery">იპოვე კანდიდატი Discovery-ში</Link> ან ხელით შეინახე მომწოდებლის წყარო.</p>;
  const evaluations = data.evaluations.filter(e => e.opportunityId === productId);
  const now = new Date();
  return <details><summary>CJ — შენახული ფასი, მარაგი და მიწოდება</summary>
    <p className="mut">პროვაიდერის ანგარიში და შეფასება; ადამიანის მიერ შემოწმებული მტკიცებულება ცალკე ითვლება. გვერდის ნახვა CJ მოთხოვნას არ აგზავნის. 24 საათი ჩვენი გადამოწმების ინტერვალია, არა ფასის გარანტია. თანხები USD-შია; სრული გადასახადები და საბოლოო თვითღირებულება აქ არ დგინდება.</p>
    {listings.map(l => <section key={l.id}><h4>{l.name}</h4><Link href={`/discovery/${l.id}`}>განაახლე ვარიანტები / მოითხოვე მიწოდება / გამოიყენე შეფასებაში</Link>
      <p className="mut">მაქსიმუმ 100 აქტიური ვარიანტი; თითოეულზე ბოლო 10 მიწოდების შეთავაზება. ეს არ არის ავტომატურად არჩეული ვარიანტი ან ყველა შეთავაზების სრული სია.</p>
      {!l.variants.length && <p>ვარიანტი და მარაგის ანგარიში ჯერ არ არის მიღებული — გახსენი განახლება.</p>}
      {l.variants.map(v => {
        const origins = originsSchema.safeParse(v.origins);
        return <div key={v.id}><p><b>{v.name}</b> · ID {v.externalId} · {v.priceMinor === null ? "ზუსტი ფასი უცნობია" : `USD ${(v.priceMinor / 100).toFixed(2)}`} · ანგარიში {date(v.observedAt)} · {now.getTime() - v.observedAt.getTime() >= REPORT_FRESH_MS ? "განახლება საჭიროა" : "ბოლო 24 საათში მიღებულია"}</p>
          <p>მარაგი: {origins.success && origins.data.length ? origins.data.map(o => `${o.countryCode}: სულ ${o.totalInventory ?? "უცნობია"}, CJ ${o.cjInventory ?? "უცნობია"}, ქარხანა ${o.factoryInventory ?? "უცნობია"}`).join("; ") : "უცნობია"}. ეს დაჯავშნას არ ნიშნავს.</p>
          {!evaluations.length && <p>მიწოდების შესადარებლად ჯერ დაამატე ბაზრის შეფასება.</p>}
          {evaluations.map(e => {
            const quotes = v.quotes.filter(q => q.marketId === e.marketId);
            return <div key={e.id}><b>{e.market.code}</b>{!e.market.countryCode && <p>ბაზარს დანიშნულების ქვეყანა აკლია — <Link href="/markets">შეავსე Markets-ში</Link>.</p>}
              {!quotes.length && <p>ამ სიაში მიწოდების შეთავაზება არ არის. მოითხოვე ან ნახე სრული ბოლო შეთავაზებები ვარიანტების გვერდზე.</p>}
              {quotes.map(q => <p key={q.id}>#{q.id} · {q.originCountry} → {q.destinationCountry} {q.postalCode} · {q.method} · USD {(q.shippingMinor / 100).toFixed(2)} · {date(q.observedAt)} · {{ route: "ბაზრის მიმდინარე ქვეყანას არ შეესაბამება", stale: "მოძველებულია — განაახლე", price: "ზუსტი პროდუქტის ფასი აკლია", review: "გადასამოწმებლად ხელმისაწვდომია" }[quoteUsability(q, e.market.countryCode, now)]}</p>)}
            </div>;
          })}
        </div>;
      })}
    </section>)}
    <h4>ფინანსურ შეფასებაში გამოყენება</h4>
    {evaluations.map(e => {
      const event = e.financialChanges[0];
      const ctx = event?.context;
      const quoteId = ctx && typeof ctx === "object" && !Array.isArray(ctx) ? ctx.quoteId : null;
      return <p key={e.id}>{e.market.code}: {event?.kind === "CJ_QUOTE" && typeof quoteId === "number" ? `ბოლო შენახვა — CJ #${quoteId}: მომწოდებლის ფასი და მიწოდება გადატანილია ESTIMATED სტატუსით; იმპორტის გადასახადები გადასამოწმებელია.` : "ბოლო შენახვა CJ quote-ის გამოყენებას არ ადასტურებს. იხილე ფინანსური ისტორია და მიმდინარე ხარჯები."} <Link href={`/history?evaluation=${e.id}`}>ისტორია</Link> · <Link href={`/opportunities/${productId}#evaluation-${e.marketId}`}>ხარჯები</Link></p>;
    })}
  </details>;
}
