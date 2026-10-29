import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
export const dynamic = "force-dynamic";
export default async function Prepare({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner(false);
  const { id } = await params, parsed = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(parsed) || parsed > 2147483647) notFound();
  const product = await prisma.opportunity.findUnique({ where: { id: parsed } });
  if (!product) notFound();
  return <><h1>Prepare a store draft</h1><p><Link href={`/opportunities/${product.id}`}>{product.name}</Link>{product.isSample && " · SAMPLE"}</p>
    <p>Write customer-facing text using sources you have checked. Research notes are not copied into the description.</p>
    <p className="warn">This downloads a JSON review file. It does not create or publish a Shopify product. Price, images, inventory and market are left for separate review.</p>
    <form method="post" action={`/opportunities/${product.id}/prepare/download`}>
      <input type="hidden" name="expectedUpdatedAt" value={product.updatedAt.toISOString()}/>
      <label>Product title<input name="title" defaultValue={product.name} required maxLength={200}/></label>
      <label>Customer-facing description (plain text; at least 20 characters)<textarea name="description" required minLength={20} maxLength={10000} rows={10} style={{ width: "100%" }}/></label>
      <p className="mut">Use sourced facts. Do not infer sales, delivery guarantees, health benefits or certifications. Enter plain text; HTML is escaped.</p>
      <label>Sources supporting these claims (one HTTP(S) URL per line, up to 10)<textarea name="sources" required maxLength={10000} rows={4} style={{ width: "100%" }}/></label>
      <label><input name="reviewed" type="checkbox" required/> I checked the factual claims against these sources. This remains an unpublished draft requiring commercial review.</label>
      <button className="primary">Download draft review file (.json)</button>
    </form><p className="mut">Typed text is only used for the download and is not saved in the app. Keep the file if you want to reuse it. Source URLs and research identifiers are private review context; inspect before sharing.</p></>;
}
