import Link from "next/link";
import { researchProgress } from "@/lib/research/progress";
import type { ResearchEvidence } from "@/lib/research/readiness";
import type { CalcResult } from "@/lib/profit/types";
export function ResearchProgress({ productId, evidence, evaluations }: {
  productId: number; evidence: ResearchEvidence[];
  evaluations: { market: { id: number; code: string }; result: CalcResult }[];
}) {
  return <section aria-label="კვლევის პროგრესი">
    <h3>კვლევის პროგრესი</h3>
    <p className="mut">პროგრესი ეფუძნება შენახულ ჩანაწერებს. კატალოგის ფასი მტკიცებულება არ არის; ვადაგასული, გაუქმებული ჩანაწერი და ვარაუდი დასრულებულ ეტაპად არ ითვლება. ეს დამოუკიდებელი შემოწმება ან გაყიდვის რეკომენდაცია არ არის.</p>
    {!evaluations.length && <p><b>შემდეგი ნაბიჯი:</b> <Link href={`/opportunities/${productId}#add-market`}>აირჩიე ბაზარი და დაამატე შეფასება</Link>. ქვეყნის არჩევამდე ადგილობრივი მიწოდება, მოთხოვნა და კონკურენცია უცნობია. თუ ბაზარი ჯერ არ გაქვს, <Link href="/markets">დაამატე Markets-ში</Link>.</p>}
    {evaluations.map(e => {
      const progress = researchProgress(evidence, e.market.id, e.result);
      return <div key={e.market.id}>
        <h4>{e.market.code} — {progress.recorded}/6 თემაზე მიმდინარე დაკვირვება შენახულია</h4>
        <p><b>შემდეგი ნაბიჯი:</b> {progress.next} <Link href={`/opportunities/${productId}#evaluation-${e.market.id}`}>გახსენი შეფასება</Link> · <Link href={`/research?product=${productId}&market=${e.market.id}`}>გახსენი ბაზრის კვლევა</Link></p>
        <details><summary>ეტაპები და ფინანსური მდგომარეობა</summary><ul>{progress.steps.map(s => <li key={s.kind}>{s.label}: {s.state === "concern" ? "რისკი გადასამოწმებელია" : s.state === "recorded" ? "მიმდინარე დაკვირვება შენახულია" : "მტკიცებულება აკლია"}</li>)}</ul>
          <p>ფინანსური მონაცემები: {!e.result.complete ? `აკლია ${e.result.missing.length} აუცილებელი მონაცემი` : `${e.result.quality === "estimated" ? "შეიცავს შეფასებით მონაცემებს" : "მომხმარებლის მიერ VERIFIED-ად მონიშნული მონაცემები"}; ${e.result.assumedZero.length} დამატებითი უცნობი ხარჯი ნულადაა ჩათვლილი. ${e.result.netProfit <= 0 ? "კონტრიბუცია დადებითი არ არის." : "დადებითი შეფასება მოგების გარანტია არ არის."}`}</p>
        </details>
      </div>;
    })}
  </section>;
}
