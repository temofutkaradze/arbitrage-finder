import { SupplierProgress } from "@/components/SupplierProgress";
import { loadSupplierProgress } from "@/lib/sourcing/progress";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth/server";
import { ResearchProgress } from "@/components/ResearchProgress";
import { rowsToInputs } from "@/lib/data/queries";
import { calculate } from "@/lib/profit/calculate";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string; before?: string }> }) {
  await requireOwner(false);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const before = sp.before === undefined ? undefined : Number(sp.before);
  if (before !== undefined && (!/^[1-9]\d*$/.test(sp.before!) || !Number.isSafeInteger(before) || before > 2147483647)) notFound();
  const products = await prisma.opportunity.findMany({
    where: { isSample: false, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}), ...(before === undefined ? {} : { id: { lt: before } }) },
    orderBy: { id: "desc" }, take: 26,
    include: { evidence: true, evaluations: { include: { market: true, inputs: true }, orderBy: { id: "asc" } }, _count: { select: { evaluations: true, evidence: true, listings: true } } },
  });
  const page = products.slice(0, 25);
  const supplierData = await loadSupplierProgress(page.map(p => p.id));
  const older = new URLSearchParams({ ...(q ? { q } : {}), before: String(page.at(-1)?.id ?? "") });
  return <>
    <h1>ჩემი პროდუქტები</h1>
    <p>აქ ინახება შენ მიერ კვლევისთვის არჩეული პროდუქტები, მათ შორის ჯერ შეუფასებელი პროდუქტებიც. თითოეულს აქვს საკუთარი კვლევა, წყაროები და ბაზრების მიხედვით შეფასებები. საწყისი GE / US კვლევის მაგალითი ამ სიას არ ავსებს.</p>
    <div className="bar"><Link href="/discovery">მოძებნე ახალი კანდიდატები</Link><Link href="/opportunities/new">დაამატე პროდუქტი ხელით</Link><Link href="/opportunities">შეადარე ფინანსური შეფასებები</Link></div>
    <form method="get" className="bar"><label>პროდუქტის სახელი<input name="q" defaultValue={q} maxLength={100}/></label><button>მოძებნე</button><Link href="/products">სრული სია</Link></form>
    <p className="mut">თითო გვერდზე მაქსიმუმ 25 პროდუქტი, ბოლო დამატებულიდან. ჩანაწერების რაოდენობა კვლევის დასრულებას ან სისწორეს არ ადასტურებს. SAMPLE პროდუქტები გამორიცხულია.</p>
    {!page.length && <p>პროდუქტი ვერ მოიძებნა. მოძებნე კანდიდატი Discovery-ში და აირჩიე Investigate this candidate, ან დაამატე ხელით.</p>}
    {page.map(p => <section className="card" key={p.id}>
      <h2><Link href={`/opportunities/${p.id}`}>{p.name}</Link></h2>
      <p className="mut">{[p.category, p.sourceName].filter(Boolean).join(" · ") || "წყარო ჯერ არ არის მითითებული"}</p>
      <p>{p._count.evaluations ? `${p._count.evaluations} ბაზრის შეფასება` : "ჯერ შეუფასებელია"} · {p._count.evidence} მტკიცებულების ჩანაწერი · {p._count.listings} დაკავშირებული კატალოგის ჩანაწერი</p>
      <SupplierProgress productId={p.id} data={supplierData}/>
      <p><Link href={`/opportunities/${p.id}/ai`}>AI კვლევა</Link></p>
      <ResearchProgress productId={p.id} evidence={p.evidence} evaluations={p.evaluations.map(e => ({ market: e.market, result: calculate(rowsToInputs(e.inputs), { pricesIncludeTax: e.market.pricesIncludeTax }) }))}/>
      <div className="bar"><Link href={`/opportunities/${p.id}`}>ხარჯები, მტკიცებულებები და ანგარიში</Link><Link href={`/research?product=${p.id}`}>კონკურენტები და კვლევის წყაროები</Link></div>
    </section>)}
    {products.length > 25 && <p><Link href={`/products?${older}`}>შემდეგი პროდუქტები →</Link></p>}
  </>;
}
