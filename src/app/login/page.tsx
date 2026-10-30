import {ActionForm} from "@/components/ActionForm";
import {BrandMark, ThemeToggle} from "@/components/WorkspaceShell";
import {signIn} from "./actions";
export const dynamic="force-dynamic";
export default function Login(){
  return <div className="login-page">
    <header className="login-header"><a className="brand" href="/login"><BrandMark/><span>Arbitrage Finder</span></a><ThemeToggle/></header>
    <main className="login-main">
      <section className="login-intro"><p className="eyebrow">პირადი კვლევის სივრცე</p><h1>ჯერ კვლევა.<br/>შემდეგ არჩევანი.</h1><p className="login-description">იპოვე პროდუქტი, შეადარე ბაზრები და დათვალე რეალური ხარჯები — ერთ სამუშაო სივრცეში.</p>
        <ol className="login-process"><li><span>01</span><div><b>მოძებნე</b><p>მომწოდებლის კატალოგი და შენახული კანდიდატები.</p></div></li><li><span>02</span><div><b>გამოიკვლიე</b><p>კონკურენტები, მიწოდება და მონაცემების წყაროები.</p></div></li><li><span>03</span><div><b>შეაფასე</b><p>ფასი, ხარჯები და რისკები გადაწყვეტილებამდე.</p></div></li></ol>
      </section>
      <section className="login-panel" aria-labelledby="sign-in-title"><div className="login-panel-heading"><BrandMark/><p className="eyebrow">Arbitrage Finder</p><h2 id="sign-in-title">შედი შენს სივრცეში</h2><p>გააგრძელე შენახული პროდუქტების კვლევა.</p></div><ActionForm action={signIn} label="Sign in"><label>Owner password<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label></ActionForm><p className="login-privacy">Private owner workspace. კვლევები და ფინანსური ჩანაწერები ხელმისაწვდომია მხოლოდ შესვლის შემდეგ.</p></section>
    </main><footer className="login-footer"><span>Arbitrage Finder</span><span>წყაროები. ხარჯები. გააზრებული არჩევანი.</span></footer>
  </div>;
}
