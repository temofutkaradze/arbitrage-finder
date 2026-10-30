import {requireOwner} from "@/lib/auth/server";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getEvalRows } from "@/lib/data/queries";
import { formatMoney } from "@/lib/profit/format";
export const dynamic = "force-dynamic";

export default async function Overview() {
  await requireOwner(false);
  const [rows, recent, sampleCount, candidateCount, productCount] = await Promise.all([
    getEvalRows(),
    prisma.opportunity.findMany({ where: { isSample: false }, orderBy: { createdAt: "desc" }, take: 5, include: { _count: { select: { evaluations: true } } } }),
    prisma.opportunity.count({ where: { isSample: true } }),
    prisma.sourceListing.count({ where: { opportunityId: null } }),
    prisma.opportunity.count({ where: { isSample: false } }),
  ]);
  const real = rows.filter(r => !r.isSample);
  const complete = real.flatMap(r => r.result.complete ? [{ r, net: r.result.netProfit }] : []);
  const incomplete = real.length - complete.length;
  const best = new Map<string, (typeof complete)[number]>();
  for (const c of complete) { const b = best.get(c.r.currency); if (!b || c.net > b.net) best.set(c.r.currency, c); }
  const steps = [
    { name: "მოძებნე კანდიდატი", href: "/discovery", description: "შეარჩიე პროდუქტი მომწოდებლის კატალოგიდან." },
    { name: "შეამოწმე მიწოდება", href: "/products", description: "დააზუსტე ვარიანტი, მარაგი და ტრანსპორტირება." },
    { name: "შეისწავლე ბაზარი", href: "/research", description: "შეადარე კონკურენტები და შეინახე წყაროები." },
    { name: "დათვალე ხარჯები", href: "/opportunities", description: "შეაფასე ეკონომიკა შენს არჩეულ ბაზარზე." },
  ];
  return <>
    <div className="page-heading overview-intro"><div><p className="eyebrow">შენი კვლევის სამუშაო სივრცე</p><h1>მიმოხილვა</h1><p>პროდუქტები, წყაროები და შემდეგი ნაბიჯი — ერთ ადგილას.</p></div><Link className="button primary" href="/discovery">მოძებნე პროდუქტი <span aria-hidden="true">→</span></Link></div>
    <div className="cards" aria-label="შენახული კვლევის მაჩვენებლები">
      <div><span className="mut">შენახული პროდუქტები</span><b>{productCount}</b></div>
      <div><span className="mut">ბაზრის შეფასებები</span><b>{real.length}</b></div>
      <div><span className="mut">სრული გამოთვლა</span><b>{complete.length}</b></div>
      <div><span className="mut">მონაცემები შესავსებია</span><b>{incomplete}</b></div>
    </div>
    <section className="next-step" aria-label="შემდეგი ნაბიჯი"><div><b>{incomplete ? `${incomplete} შეფასებას აუცილებელი მონაცემები აკლია` : candidateCount ? `${candidateCount} კანდიდატი კვლევას ელოდება` : "კვლევა ერთი პროდუქტით იწყება"}</b><p>{incomplete ? "შეავსე ფასი და ხარჯები, რომ ფინანსური შედეგის დათვლა შეძლო." : "აირჩიე კანდიდატი და გადაამოწმე მომწოდებლის პირობები."}</p></div><Link className="button" href={incomplete ? "/opportunities" : "/discovery"}>{incomplete ? "გახსენი შეფასებები" : "გახსენი კატალოგი"} <span aria-hidden="true">→</span></Link></section>
    <div className="overview-grid">
      <section className="panel"><div className="section-heading"><h2>ბოლო პროდუქტები</h2><Link href="/products">ყველა პროდუქტი →</Link></div>
        {recent.length ? <ul className="ledger-list">{recent.map(o => <li key={o.id}><Link href={`/opportunities/${o.id}`}><span><b>{o.name}</b><small>{o._count.evaluations ? `${o._count.evaluations} ბაზრის შეფასება` : "ბაზარი ჯერ არ არის არჩეული"} · {new Intl.DateTimeFormat("ka-GE", { dateStyle: "medium", timeZone: "Asia/Tbilisi" }).format(o.createdAt)}</small></span><span className="row-arrow" aria-hidden="true">→</span></Link></li>)}</ul> : <div className="empty-state"><p>შენახული პროდუქტი ჯერ არ გაქვს. აირჩიე კანდიდატი კატალოგიდან ან დაამატე ხელით.</p><Link className="button" href="/opportunities/new">დაამატე პირველი პროდუქტი</Link></div>}
      </section>
      <section className="panel"><div className="section-heading"><h2>შეფასებული შედეგი</h2><Link href="/opportunities">შეფასებები →</Link></div><p className="mut">მაქსიმალური კონტრიბუცია რეკლამის შემდეგ, თითო შეკვეთაზე და ვალუტაზე.</p>
        {best.size ? <ul className="ledger-list">{[...best.entries()].map(([cur, c]) => <li key={cur}><Link href={`/opportunities/${c.r.opportunityId}`}><span><b>{c.r.name}</b><small>{c.r.marketCode} · {c.r.result.quality === "verified" ? "მომხმარებლის მიერ დადასტურებული მონაცემები" : "შეიცავს შეფასებით მონაცემებს"}</small></span><strong className={c.net > 0 ? "pos" : c.net < 0 ? "neg" : undefined}>{formatMoney(c.net, cur)}</strong></Link></li>)}</ul> : <p className="result-empty">შედეგი ჯერ არ არის დათვლილი. შეავსე აუცილებელი ხარჯები შეფასებაში.</p>}
        <details className="result-note"><summary>როგორ წავიკითხო შედეგი</summary><p className="fine-print">ფიქსირებული ხარჯები და საშემოსავლო გადასახადი გამორიცხულია. ვალუტები ცალ-ცალკე ფასდება; შედეგი მოგების გარანტია არ არის.</p></details>
      </section>
    </div>
    <section className="panel"><div className="section-heading"><h2>პროდუქტის კვლევის გზა</h2><Link href="/research">კვლევის სივრცე →</Link></div><ol className="workflow">{steps.map((step, i) => <li key={step.href}><span>ეტაპი {i + 1}</span><Link href={step.href}>{step.name}</Link><p>{step.description}</p></li>)}</ol></section>
    <details><summary>მონაცემების შესახებ</summary><p className="mut">მაჩვენებლები ეფუძნება შენახულ ჩანაწერებს. {candidateCount} კატალოგის კანდიდატი კვლევას ელოდება და ფინანსურ მაჩვენებლებში არ შედის. {sampleCount > 0 ? `${sampleCount} SAMPLE პროდუქტი ყველა მაჩვენებლიდან გამორიცხულია.` : "სატესტო პროდუქტები მაჩვენებლებში არ შედის."} კატალოგის ფასის დაკვირვებები ხელმისაწვდომია თითოეულ კანდიდატზე; აქ ფასის ცვლილებები არ ჯამდება.</p><p className="mut">საწყისი GE / US კვლევა ცალკე მომზადებული მაგალითია. ავტომატური კანდიდატების ძიება იმართება <Link href="/automation">ავტომატიზაციიდან</Link>; მოთხოვნისა და მოგების სრული ავტომატური კვლევა ჯერ არ არის დაკავშირებული.</p></details>
  </>;
}
