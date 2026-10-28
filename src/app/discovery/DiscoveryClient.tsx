"use client";
import Link from "next/link";
import { useState } from "react";
import { parseCsv, type DiscoveredProduct } from "@/lib/discovery/products";

export function DiscoveryClient() {
  const [products, setProducts] = useState<DiscoveredProduct[]>([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function discover() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ q: keyword, page: String(page) });
      const res = await fetch("/api/discovery/cj?" + params, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Discovery failed");
      setProducts(data.products);
    } catch (err) { setError(err instanceof Error ? err.message : "Discovery failed"); }
    finally { setLoading(false); }
  }
  async function loadCsv(file: File | undefined) {
    if (!file) return;
    setError("");
    try { setProducts(parseCsv(await file.text())); }
    catch (err) { setError(err instanceof Error ? err.message : "Invalid CSV"); }
  }
  return (
    <section className="card">
      <h2>CJ catalog search</h2>
      <div className="bar">
        <input aria-label="Search keyword" placeholder="Optional keyword" maxLength={100} value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1); }} />
        <button type="button" disabled={loading} onClick={discover}>{loading ? "Searching…" : "Discover products"}</button>
        <button type="button" disabled={loading || page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous page</button>
        <span>Page {page}</span>
        <button type="button" disabled={loading || page >= 1000} onClick={() => setPage(p => p + 1)}>Next page</button>
      </div>
      <h2>CSV fallback</h2>
      <p className="mut">Headers: externalId,name,price,currency,category,sourceUrl. Prices are in major units (e.g. 9.50 USD). This preview stays in your browser.</p>
      <input aria-label="CSV file" type="file" accept=".csv,text/csv" onChange={e => { void loadCsv(e.target.files?.[0]); }} />
      {error && <p className="warn" role="alert">{error}</p>}
      <h2>Candidates ({products.length})</h2>
      <div className="wrap"><table><thead><tr><th>Product</th><th>Source</th><th>Supplier catalog price</th><th>Research</th></tr></thead>
      <tbody>{products.map(p => {
        const params = new URLSearchParams({ name: p.name, category: p.category, sourceName: p.source, sourceUrl: p.sourceUrl, notes: "Candidate ID: " + p.externalId + ". Indicative catalog price: " + (p.price === null ? "unknown" : p.price + " " + p.currency) + ". Confirm variant cost, shipping and taxes before evaluation." });
        return <tr key={p.source + ":" + p.externalId}><td>{p.name}</td><td>{p.source}</td><td>{p.price === null ? "Unknown" : p.price.toFixed(2) + " " + p.currency}</td><td><Link href={"/opportunities/new?" + params}>Evaluate</Link></td></tr>;
      })}</tbody></table></div>
    </section>
  );
}
