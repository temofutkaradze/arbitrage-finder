// Scenario amounts are GEL minor units. No amounts are applied to saved evaluations.
export function paymentScenario(domestic: number, foreign: number, apple: number) {
  for (const n of [domestic, foreign, apple]) if (!Number.isSafeInteger(n) || n < 0 || n > 100_000_000) throw new Error("შეიყვანე თანხა 0–1,000,000 GEL ფარგლებში.");
  if (apple > domestic + foreign) throw new Error("Apple Pay ბრუნვა მთლიანი ბრუნვის ნაწილი უნდა იყოს.");
  const baseFee = Math.round(domestic * 200 / 10000) + Math.round(foreign * 250 / 10000);
  const topUp = Math.max(0, 5000 - baseFee);
  const appleExtra = Math.round(apple * 40 / 10000);
  const monthlyReserve = Math.round(foreign * 1000 / 10000);
  return { baseFee, topUp, appleExtra, fees: baseFee + topUp + appleExtra, monthlyReserve, sixMonthReserve: monthlyReserve * 6 };
}
export function parseGel(value: string) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value)) throw new Error("გამოიყენე არაუარყოფითი თანხა, მაქსიმუმ ორი ათწილადით (მაგ. 1000.50).");
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
