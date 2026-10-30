import { calculate } from "../profit/calculate";
import type { Inputs } from "../profit/types";
export type PriceObservation={id:number;marketId:number;url:string;observedAt:Date;expiresAt:Date;match:string;currency:string;taxBasis:string;priceMinor:number;shippingMinor:number|null};
export function competitorPriceScenarios(rows:PriceObservation[],inputs:Inputs,market:{id:number;currency:string;pricesIncludeTax:boolean},now=new Date()) {
 const seen=new Set<string>();
 const latest=rows.filter(r=>r.marketId===market.id).sort((a,b)=>b.observedAt.getTime()-a.observedAt.getTime()||b.id-a.id).filter(r=>{if(seen.has(r.url))return false;seen.add(r.url);return true;});
 const usable=latest.filter(r=>r.currency===market.currency&&r.taxBasis===(market.pricesIncludeTax?"INCLUDED":"EXCLUDED")&&r.observedAt<=now&&r.expiresAt>now&&r.shippingMinor!==null&&["EXACT","EQUIVALENT"].includes(r.match));
 return {excluded:rows.filter(r=>r.marketId===market.id).length-usable.length,groups:["EXACT","EQUIVALENT"].flatMap(match=>{
  const sources=usable.filter(r=>r.match===match).sort((a,b)=>(a.priceMinor+a.shippingMinor!)-(b.priceMinor+b.shippingMinor!));
  if(!sources.length)return [];
  const prices=sources.map(r=>r.priceMinor+r.shippingMinor!),mid=Math.floor(prices.length/2);
  const median=prices.length%2?prices[mid]:Math.round((prices[mid-1]+prices[mid])/2);
  return [{match,sources,scenarios:[{label:"დაბალი",price:prices[0]},{label:"მედიანური",price:median},{label:"მაღალი",price:prices.at(-1)!}].map(s=>({...s,result:calculate({...inputs,sellingPrice:{value:s.price,status:"ESTIMATED"},shippingCharged:{value:0,status:"ESTIMATED"}},{pricesIncludeTax:market.pricesIncludeTax})}))}];
 })};
}
