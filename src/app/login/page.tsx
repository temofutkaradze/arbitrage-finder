import {ActionForm} from "@/components/ActionForm";
import {signIn} from "./actions";
export const dynamic="force-dynamic";
export default function Login(){return <main style={{maxWidth:460,paddingTop:80}}><h1>Arbitrage Finder</h1><p className="mut">Private owner workspace. Sign in to view research and product economics.</p><section className="card"><ActionForm action={signIn} label="Sign in"><label>Owner password<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label></ActionForm></section></main>;}
