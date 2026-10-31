"use client";
import Link from "next/link";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return <main className="card" role="alert">
    <h1>გვერდის ჩატვირთვა ვერ დასრულდა</h1>
    <p>სცადე გვერდის ხელახლა ჩატვირთვა. თუ შეცდომა შენახვის ან API მოთხოვნის შემდეგ გამოჩნდა, ჯერ გადაამოწმე ჩანაწერები და ბოლო მცდელობები — მოქმედება შეიძლება დასრულებული იყოს.</p>
    <button onClick={() => retry()}>გვერდის ხელახლა ჩატვირთვა</button>
    <p><Link href="/">მიმოხილვაზე დაბრუნება</Link></p>
  </main>;
}
