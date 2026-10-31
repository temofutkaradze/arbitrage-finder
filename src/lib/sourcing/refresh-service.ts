import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { refreshVariants,reserveCjOperation,fetchFreight } from "@/lib/sourcing/service";
import { savedRefreshRoutes } from "@/lib/sourcing/refresh-plan";
const id=z.number().int().positive().max(2147483647);
const safe=(e:unknown)=>e instanceof Error&&/^(CJ |Wait |Select |Set |Refresh |The selected )/.test(e.message)?e.message:"განახლება ვერ დადასტურდა. გადაამოწმე შენახული მონაცემები; ავტომატური განმეორება არ ხდება.";
export async function startProductRefresh(listingId:number){
 try{
  id.parse(listingId);
  const listing=await prisma.sourceListing.findUniqueOrThrow({where:{id:listingId},include:{variants:{where:{active:true},orderBy:{id:"asc"},take:101}}});
  if(listing.provider!=="cj"||listing.importedVia!=="CJ_API"||!listing.opportunityId)throw new Error("Select a saved CJ candidate first.");
  const quotes=await prisma.shippingQuote.findMany({where:{variant:{listingId}},include:{market:true},orderBy:{id:"desc"},take:101});
  const plan=savedRefreshRoutes(quotes.slice(0,100));
  await reserveCjOperation();await refreshVariants(listingId);
  const current=await prisma.supplierVariant.findMany({where:{listingId},orderBy:{id:"asc"},take:101});
  const changes=current.slice(0,100).flatMap(v=>{
   const old=listing.variants.find(o=>o.id===v.id);
   const label=v.sku??v.externalId;
   if(!v.active)return old?[`${label}: ვარიანტი აღარ არის აქტიური`]:[];
   const price=(n:number|null)=>n===null?"უცნობია":`USD ${(n/100).toFixed(2)}`;
   return [`${label}: ${old?price(old.priceMinor):"ახალი ვარიანტი"} → ${price(v.priceMinor)}${old&&JSON.stringify(old.origins)!==JSON.stringify(v.origins)?"; მარაგის ანგარიში შეიცვალა":""}`];
  });
  return {ok:true,message:`ვარიანტები და მარაგი განახლდა. შედარება მაქსიმუმ 100 ვარიანტს მოიცავს.${quotes.length>100?" გეგმა ბოლო 100 შეთავაზებიდან შეიქმნა.":""} გამოტოვებული მარშრუტები: ${plan.omitted}.`,routes:plan.routes,changes};
 }catch(e){return {ok:false,message:safe(e),routes:[],changes:[]};}
}
export async function refreshSavedRoute(listingId:number,quoteId:number){
 try{
  id.parse(listingId);id.parse(quoteId);
  const q=await prisma.shippingQuote.findUniqueOrThrow({where:{id:quoteId},include:{market:true,variant:{include:{listing:true}}}});
  if(q.variant.listingId!==listingId||q.variant.listing.provider!=="cj"||q.variant.listing.importedVia!=="CJ_API"||!q.variant.listing.opportunityId)throw new Error("Select a saved CJ route for this product.");
  if(q.market.countryCode!==q.destinationCountry)return {ok:false,message:"გამოტოვებულია: ბაზრის ქვეყანა შეიცვალა. ახალი მარშრუტი ხელით აირჩიე."};
  if(!q.variant.active)return {ok:false,message:"გამოტოვებულია: ვარიანტი აღარ არის აქტიური."};
  await reserveCjOperation();
  const count=await fetchFreight({variantId:q.variantId,marketId:q.marketId,originCountry:q.originCountry,postalCode:q.postalCode});
  const latest=count?await prisma.shippingQuote.findMany({where:{variantId:q.variantId,marketId:q.marketId,originCountry:q.originCountry,destinationCountry:q.destinationCountry,postalCode:q.postalCode},orderBy:{id:"desc"},take:count}):[];
  const lowest=latest.length?Math.min(...latest.map(v=>v.shippingMinor)):null;
  const comparison=lowest===null?"":` ძველი არჩეული მეთოდის shipping: USD ${(q.shippingMinor/100).toFixed(2)}; ახალი მეთოდების მინიმუმი: USD ${(lowest/100).toFixed(2)}. მეთოდი/ვადა შეიძლება განსხვავდებოდეს; ეს მხოლოდ shipping-ის შედარებაა.`;
  return {ok:true,message:count?`შენახულია ${count} ახალი მიწოდების შეფასება. გამოიყენე მხოლოდ გადახედვის შემდეგ.${comparison}`:"CJ-მ ამ მარშრუტზე მეთოდი არ დააბრუნა. ძველი შეთავაზებები ისტორიად რჩება — ახალ შედეგად არ ჩაითვლება."};
 }catch(e){return {ok:false,message:safe(e)};}
}
