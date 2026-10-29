import { requireOwner } from "@/lib/auth/server";
import { configuredAuth } from "@/lib/auth/core";
import { prisma } from "@/lib/db/prisma";
import { buildStoreDraft } from "@/lib/store-draft/build";
export const dynamic = "force-dynamic";
const base = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
const error = (message: string, status: number) => new Response(message, { status, headers: { ...base, "Content-Type": "text/plain; charset=utf-8" } });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner(false);
  if (request.headers.get("origin") !== configuredAuth().origin) return error("Request origin is not allowed.", 403);
  const { id } = await params, parsed = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(parsed) || parsed > 2147483647) return error("Product not found.", 404);
  const reader = request.body?.getReader(); if (!reader) return error("Enter draft details.", 400);
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > 32_000) { await reader.cancel(); return error("Draft form is limited to 32 KB.", 413); } chunks.push(chunk.value); }
    const data = await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") ?? "" }, body: Buffer.concat(chunks) }).formData();
    const product = await prisma.opportunity.findUnique({ where: { id: parsed } });
    if (!product) return error("Product not found.", 404);
    if (data.get("expectedUpdatedAt") !== product.updatedAt.toISOString()) return error("Research product changed. Reopen the preparation page before downloading.", 409);
    const raw = Object.fromEntries(["title", "description", "sources", "reviewed"].map(key => [key, data.get(key)]));
    const payload = buildStoreDraft(raw, product);
    return new Response(JSON.stringify(payload, null, 2) + "\n", { headers: { ...base, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="store-draft-${parsed}.json"` } });
  } catch { return error("Draft could not be generated. Check title, description, source URLs and review confirmation, then return to the form. No store was changed.", 400); }
}
