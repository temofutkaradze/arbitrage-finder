export type SavedRoute={id:number;variantId:number;marketId:number;originCountry:string;destinationCountry:string;postalCode:string;market:{code:string;countryCode:string|null}};
export function savedRefreshRoutes(quotes:SavedRoute[]) {
 const seen=new Set<string>();
 const routes=quotes.filter(q=>{
  const key=JSON.stringify([q.variantId,q.marketId,q.originCountry,q.destinationCountry,q.postalCode]);
  if(seen.has(key))return false;seen.add(key);return true;
 });
 return {routes:routes.slice(0,3).map(q=>({quoteId:q.id,label:`${q.market.code}: ${q.originCountry} → ${q.destinationCountry} ${q.postalCode}`})),omitted:Math.max(0,routes.length-3)};
}
