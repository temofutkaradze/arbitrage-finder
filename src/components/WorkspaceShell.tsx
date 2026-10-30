"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

const groups = [
  { label: "სამუშაო სივრცე", links: [
    { href: "/", label: "მიმოხილვა", icon: "home" },
    { href: "/discovery", label: "პროდუქტის ძიება", icon: "search" },
    { href: "/products", label: "ჩემი პროდუქტები", icon: "box" },
    { href: "/research", label: "ბაზრის კვლევა", icon: "research" },
    { href: "/opportunities", label: "შეფასებები", icon: "chart" },
  ] },
  { label: "ინსტრუმენტები", links: [
    { href: "/matching", label: "პროდუქტის შედარება", icon: "match" },
    { href: "/markets", label: "ბაზრები", icon: "globe" },
    { href: "/payments", label: "გადახდის სცენარი", icon: "card" },
    { href: "/automation", label: "ავტომატიზაცია", icon: "automation" },
  ] },
  { label: "ჩანაწერები", links: [
    { href: "/history", label: "ფინანსური ისტორია", icon: "history" },
    { href: "/market-study", label: "საწყისი GE / US კვლევა", icon: "book" },
  ] },
];
const paths: Record<string, string> = {
  home: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  box: "m12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v9M7.5 5.5l9 5",
  research: "M5 3h10l4 4v14H5V3ZM14 3v5h5M8 12h8M8 16h5",
  chart: "M4 3v17h17M8 16v-5M13 16V7M18 16v-8",
  match: "M3 7h18m-4-4 4 4-4 4M21 17H3m4-4-4 4 4 4",
  globe: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z",
  card: "M3 5h18v14H3V5ZM3 10h18M7 15h4",
  automation: "m13 2-9 12h7l-1 8 10-13h-8l1-7Z",
  history: "M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2",
  book: "M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1ZM12 5v15",
};
export function WorkspaceIcon({ name }: { name: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.home}/></svg>;
}
export function BrandMark() {
  return <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 25 14 5h4l10 20M9 18h14M13 25l3-6 3 6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>;
}
let memoryTheme = "light";
function readTheme() { try { return localStorage.getItem("arbitrage-theme") ?? memoryTheme; } catch { return memoryTheme; } }
function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback); window.addEventListener("arbitrage-theme", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("arbitrage-theme", callback); };
}
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light");
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  return <button className="theme-toggle" type="button" aria-label={theme === "light" ? "მუქი თემა" : "ღია თემა"} onClick={() => {
    memoryTheme = theme === "light" ? "dark" : "light";
    try { localStorage.setItem("arbitrage-theme", memoryTheme); } catch { /* Theme still works when browser storage is unavailable. */ }
    window.dispatchEvent(new Event("arbitrage-theme"));
  }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{theme === "light" ? <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/> : <><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>}</svg><span>{theme === "light" ? "მუქი თემა" : "ღია თემა"}</span></button>;
}
export function WorkspaceShell({ children, signOut }: { children: ReactNode; signOut: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const active = groups.flatMap(g => g.links).find(l => l.href === "/" ? pathname === "/" : pathname === l.href || pathname.startsWith(`${l.href}/`));
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); menuRef.current?.focus(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);
  return <div className="workspace">
    <a className="skip-link" href="#main-content">გადადით შინაარსზე</a>
    <header className="mobile-header"><Link href="/" className="brand"><BrandMark/><span>Arbitrage Finder</span></Link><button ref={menuRef} type="button" aria-expanded={open} aria-controls="workspace-navigation" onClick={() => setOpen(!open)}>მენიუ</button></header>
    <aside className={`sidebar${open ? " is-open" : ""}`}>
      <Link href="/" className="brand sidebar-brand" onClick={() => setOpen(false)}><BrandMark/><span>Arbitrage<span className="brand-secondary">Finder</span></span></Link>
      <p className="workspace-caption">პროდუქტის კვლევა</p>
      <nav id="workspace-navigation" aria-label="მთავარი ნავიგაცია">{groups.map(group => <div className="nav-group" key={group.label}>
        <p className="nav-group-label">{group.label}</p>
        {group.links.map(link => <Link key={link.href} href={link.href} aria-current={active?.href === link.href ? "page" : undefined} onClick={() => setOpen(false)}><WorkspaceIcon name={link.icon}/><span>{link.label}</span></Link>)}
      </div>)}</nav>
      <div className="sidebar-footer"><span className="owner-mark" aria-hidden="true">AF</span><div><b>პირადი სივრცე</b><span>მხოლოდ მფლობელისთვის</span></div></div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-toolbar"><p><span>სამუშაო სივრცე</span><span aria-hidden="true"> / </span><strong>{active?.label ?? "პროდუქტის კვლევა"}</strong></p><div className="toolbar-actions"><ThemeToggle/>{signOut}</div></header>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <footer className="workspace-footer"><span>Arbitrage Finder</span><span>კანდიდატიდან დასაბუთებულ გადაწყვეტილებამდე.</span></footer>
    </div>
  </div>;
}
