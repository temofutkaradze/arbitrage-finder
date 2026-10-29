import {requireOwner} from "@/lib/auth/server";
import {signOut} from "@/app/login/actions";
import Link from "next/link";
export default async function ProtectedLayout({children}:{children:React.ReactNode}){
 await requireOwner(false);
 return <>
        <header className="top">
          <b>Arbitrage Finder</b>
          <nav><Link href="/">Overview</Link><Link href="/discovery">Discovery</Link><Link href="/matching">Matching</Link><Link href="/research">Research</Link><Link href="/automation">Automation</Link><Link href="/opportunities">Opportunities</Link><Link href="/markets">Markets</Link><Link href="/market-study">GE / US study</Link></nav><form action={signOut}><button>Sign out</button></form>
        </header>
        <main>{children}</main>
 </>;
}
