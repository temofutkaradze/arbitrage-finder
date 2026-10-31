import Link from "next/link";

export default function NotFound() {
  return <main className="card">
    <h1>გვერდი ვერ მოიძებნა</h1>
    <p>ბმული შეიძლება არასწორი იყოს ან ჩანაწერი წაშლილი იყოს.</p>
    <p><Link href="/products">ჩემი პროდუქტები</Link> · <Link href="/">მიმოხილვა</Link></p>
  </main>;
}
