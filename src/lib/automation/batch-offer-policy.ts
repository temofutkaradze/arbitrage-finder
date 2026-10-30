import {EBAY_MARKETS} from "../providers/ebay";
export function offerBlockReason(input:{configured:boolean;country:string|null;currency:string;evaluated:boolean;query:string}){
 if(!input.configured)return "eBay წვდომა კონფიგურირებული არ არის. შეთავაზებები ხელით ან ნებადართული JSON-ით დაამატე.";
 if(!input.country||EBAY_MARKETS[input.country]?.currency!==input.currency)return "ბაზრის ქვეყანა/ვალუტა eBay-ის მხარდაჭერილ კომბინაციას არ შეესაბამება.";
 if(!input.evaluated)return "ამ პროდუქტს არჩეული ბაზრის შეფასება ჯერ არ აქვს. ჯერ პროდუქტის გვერდზე დაამატე.";
 if(input.query.trim().length<2||input.query.length>100)return "კატალოგის სახელი ძიებისთვის 2–100 სიმბოლო უნდა იყოს; გამოიყენე Research-ის ხელით ძიება.";
 return null;
}
