import { NextRequest, NextResponse } from "next/server";
import { normalizeCjResponse } from "@/lib/discovery/products";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Personal-use development endpoint only. Never expose token-backed catalog access publicly.
  if (process.env.NODE_ENV !== "development" || !["localhost", "127.0.0.1"].includes(request.nextUrl.hostname)) {
    return NextResponse.json({ error: "Local development only" }, { status: 403 });
  }
  const token = process.env.CJ_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "CJ_ACCESS_TOKEN is not configured locally" }, { status: 503 });
  const keyword = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (keyword.length > 100) return NextResponse.json({ error: "Keyword too long" }, { status: 400 });
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  if (!Number.isInteger(page) || page < 1 || page > 1000) return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  const url = new URL("https://developers.cjdropshipping.com/api2.0/v1/product/listV2");
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", "20");
  if (keyword) url.searchParams.set("keyWord", keyword);
  try {
    const response = await fetch(url, {
      headers: { "CJ-Access-Token": token },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return NextResponse.json({ error: "CJ request failed (" + response.status + ")" }, { status: 502 });
    const products = normalizeCjResponse(await response.json());
    return NextResponse.json({ products }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "CJ request failed or returned invalid data" }, { status: 502 });
  }
}
