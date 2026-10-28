import { configureProxyFromEnvironment } from "./network";
import { z } from "zod";
import { listingSchema, type ListingInput } from "./schema";

const AUTH_ERROR = "CJ authentication failed. The supplied credential was not accepted as an access token or API Key. Check your CJ account credential and update it securely. No candidates were saved.";
const AUTH_REJECTED = Symbol("CJ_AUTH_REJECTED");
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const envelope = z.object({ code: z.number(), result: z.boolean().optional(), success: z.boolean().optional(), data: z.unknown() });
const product = z.object({ id: z.string().min(1), nameEn: z.string().min(1), sellPrice: z.union([z.string(), z.number()]) });
const pageSchema = z.object({ content: z.array(z.object({ productList: z.array(product) })) });
const tokenData = z.object({ accessToken: z.string().min(1), accessTokenExpiryDate: z.string().optional() });
// Derived credentials stay in this process only. Concurrent exchanges share one
// promise; failures are discarded. Nothing is written to disk, DB, logs or UI.
let tokenCache: { credential: string; expiresAt: number; token: Promise<string> } | undefined;

export function normalizeCjPage(data: unknown, observedAt: Date): ListingInput[] {
  return pageSchema.parse(data).content.flatMap((group) => group.productList.map((p) => {
    const amount = String(p.sellPrice);
    const priceMinor = /^\d+(\.\d{1,2})?$/.test(amount) ? Math.round(Number(amount) * 100) : null;
    return listingSchema.parse({ provider: "cj", externalId: p.id, name: p.nameEn,
      url: `https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${encodeURIComponent(p.id)}`,
      currency: "USD", priceMinor, observedAt: observedAt.toISOString() });
  }));
}

async function request(url: URL | string, init: RequestInit) {
  try {
    return await fetch(url, { ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000) });
  } catch { throw new Error("CJ request could not complete. Check connectivity and try later."); }
}
function checkHttp(response: Response) {
  if (response.status === 429) throw new Error("CJ rate limit reached. Wait before trying again; no candidates were saved.");
  if (!response.ok) throw new Error(`CJ returned HTTP ${response.status}. Check account access; no candidates were saved.`);
}
async function exchangeApiKey(credential: string): Promise<string> {
  if (tokenCache?.credential === credential && tokenCache.expiresAt > Date.now()) return tokenCache.token;
  const entry = { credential, expiresAt: Date.now() + 3600_000, token: Promise.resolve("") };
  tokenCache = entry;
  entry.token = (async () => {
    const response = await request(`${API}/authentication/getAccessToken`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: credential }),
    });
    if (response.status === 401) throw new Error(AUTH_ERROR);
    checkHttp(response);
    const result = envelope.parse(await response.json());
    if (!(result.result || result.success) || result.code !== 200) throw new Error(AUTH_ERROR);
    const data = tokenData.parse(result.data);
    const expiry = data.accessTokenExpiryDate ? Date.parse(data.accessTokenExpiryDate) : NaN;
    if (Number.isFinite(expiry)) {
      entry.expiresAt = Math.min(entry.expiresAt, expiry - 60_000);
      if (entry.expiresAt <= Date.now()) throw new Error(AUTH_ERROR);
    }
    return data.accessToken;
  })();
  try { return await entry.token; }
  catch (error) { if (tokenCache === entry) tokenCache = undefined; throw error; }
}

async function catalogue(url: URL, token: string, body?: unknown): Promise<unknown> {
  const response = await request(url, { method: body === undefined ? "GET" : "POST", headers: { "CJ-Access-Token": token, ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (response.status === 401) return AUTH_REJECTED;
  checkHttp(response);
  const result = envelope.parse(await response.json());
  if (result.code === 1600001) return AUTH_REJECTED;
  if (!(result.result || result.success) || result.code !== 200) throw new Error(`CJ rejected the request (code ${result.code}). Check account access and quota.`);
  return result.data;
}

type CjResource = "product/listV2" | "product/query" | "product/stock/getInventoryByPid" | "logistic/freightCalculate";
/** Only read/estimate resources are exposed: no order or store mutation APIs. */
export async function requestCj(resource: CjResource, query: Record<string, string> = {}, body?: unknown, credential = process.env.CJ_ACCESS_TOKEN) {
  if (!credential) throw new Error("CJ_ACCESS_TOKEN is not configured. Add a CJ access token or API Key securely to the server environment, or import an authorised catalogue JSON file.");
  configureProxyFromEnvironment();
  const url = new URL(`${API}/${resource}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const cached = tokenCache?.credential === credential && tokenCache.expiresAt > Date.now() ? tokenCache : undefined;
  let data = await catalogue(url, cached ? await cached.token : credential, body);
  if (data === AUTH_REJECTED) {
    if (cached && tokenCache === cached) tokenCache = undefined;
    const token = await exchangeApiKey(credential);
    data = await catalogue(url, token, body);
    if (data === AUTH_REJECTED) { tokenCache = undefined; throw new Error(AUTH_ERROR); }
  }
  return data;
}

export async function discoverCj(keyword: string, credential = process.env.CJ_ACCESS_TOKEN) {
  const data = await requestCj("product/listV2", { page: "1", size: "20", keyWord: keyword }, undefined, credential);
  return normalizeCjPage(data, new Date());
}
