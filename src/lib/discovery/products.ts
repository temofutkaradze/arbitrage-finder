export type DiscoveredProduct = {
  source: "CJ" | "CSV";
  externalId: string;
  name: string;
  price: number | null;
  currency: string;
  category: string;
  sourceUrl: string;
};

const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
const price = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function dedupeProducts(products: DiscoveredProduct[]): DiscoveredProduct[] {
  const map = new Map<string, DiscoveredProduct>();
  for (const item of products) {
    if (!item.externalId || !item.name) continue;
    map.set(item.source + ":" + item.externalId, item);
  }
  return [...map.values()];
}

export function normalizeCjResponse(payload: unknown): DiscoveredProduct[] {
  if (!payload || typeof payload !== "object") throw new Error("Invalid CJ response");
  const root = payload as Record<string, unknown>;
  if (root.result !== true || root.code !== 200) throw new Error("CJ request was unsuccessful");
  const data = root.data as { content?: { productList?: unknown[] }[] } | undefined;
  const groups = data?.content;
  if (!Array.isArray(groups)) throw new Error("CJ product list missing");
  const output: DiscoveredProduct[] = [];
  for (const group of groups) {
    for (const raw of Array.isArray(group?.productList) ? group.productList : []) {
      if (!raw || typeof raw !== "object") continue;
      const p = raw as Record<string, unknown>;
      const id = text(p.id);
      const name = text(p.nameEn);
      if (!id || !name) continue;
      output.push({
        source: "CJ", externalId: id, name,
        price: price(p.nowPrice) ?? price(p.sellPrice),
        currency: "USD",
        category: text(p.threeCategoryName),
        sourceUrl: "",
      });
    }
  }
  return dedupeProducts(output);
}

// Explicit CSV contract: externalId,name,price,currency,category,sourceUrl.
// Parse quoted commas, quotes, and newlines; reject malformed input rather than guessing.
export function parseCsv(input: string): DiscoveredProduct[] {
  if (input.length > 2_000_000) throw new Error("CSV exceeds 2 MB");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift()?.map(x => x.replace(/^\uFEFF/, "").trim()) ?? [];
  const required = ["externalId", "name", "price", "currency", "category", "sourceUrl"];
  if (required.some(h => !header.includes(h))) throw new Error("CSV headers must be: " + required.join(","));
  const items: DiscoveredProduct[] = [];
  for (const fields of rows) {
    if (fields.every(v => !v.trim())) continue;
    if (fields.length !== header.length) throw new Error("CSV row has incorrect column count");
    const record = Object.fromEntries(header.map((h, i) => [h, fields[i].trim()]));
    if (!record.externalId || !record.name) throw new Error("CSV product ID and name required");
    const amount = price(record.price);
    if (record.price && amount === null) throw new Error("Invalid price for " + record.externalId);
    const currency = (record.currency || "USD").toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid currency");
    const url = record.sourceUrl;
    if (url && !/^https?:\/\//i.test(url)) throw new Error("Source URL must use HTTP(S)");
    items.push({
      source: "CSV", externalId: record.externalId, name: record.name,
      price: amount, currency, category: record.category, sourceUrl: url,
    });
  }
  return dedupeProducts(items);
}
