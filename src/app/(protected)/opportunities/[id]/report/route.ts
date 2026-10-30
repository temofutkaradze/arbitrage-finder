import { requireOwner } from "@/lib/auth/server";
import { loadReport, ReportLimitError } from "@/lib/reports/data";
import { researchPackage } from "@/lib/reports/package";
import { renderReport } from "@/lib/reports/render";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner(false); // Route handlers do not inherit the protected layout.
  const format=new URL(request.url).searchParams.get("format")??"txt";
  if(format!=="txt"&&format!=="json")return new Response("Unsupported report format.",{status:400,headers});
  const { id } = await params;
  const parsed = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(parsed) || parsed > 2147483647) return new Response("Report not found.", { status: 404, headers });
  try {
    const data = await loadReport(parsed);
    if (!data) return new Response("Report not found.", { status: 404, headers });
    const now = new Date(), body = format==="json"?JSON.stringify(researchPackage(data,now),null,2)+"\n":renderReport(data, now);
    if (Buffer.byteLength(body, "utf8") > 5_000_000) throw new ReportLimitError();
    return new Response(body, { headers: { ...headers, "Content-Type":format==="json"?"application/json; charset=utf-8":headers["Content-Type"], "Content-Disposition": `attachment; filename="research-${parsed}-${now.toISOString().slice(0,10)}.${format}"` } });
  } catch (e) {
    return new Response(e instanceof ReportLimitError ? "Report exceeds export limits. No partial report was generated." : "Report unavailable. Please try again.", { status: e instanceof ReportLimitError ? 413 : 503, headers });
  }
}
