# Interface direction — 2026-10-30

A private research workspace, not a storefront or subscription service. The main
question is: which product needs evidence or cost inputs next? The dashboard uses
saved counts and evaluations; it never invents demand, growth or profit figures.

## References actually used

- [Taste Skill](https://github.com/Leonxlnx/taste-skill), commit
  `12af471f627f866411b4bd785b19646d3672784c`: read `skills/taste-skill/SKILL.md`
  and `references/app-screens.md`, ran the app-direction draw and browser inspector.
  Selected **Achromatic ledger**, seed **1571144364**, without redraws. Kept palette
  and type as requested: quiet stone, charcoal, muted forest actions, Georgian text.
  Its signature here is the evidence-to-evaluation workflow and missing-input queue.
- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), commit
  `28b3b8dee8c976df4fa3e94aed4e092ad43fcb03`: read its SKILL and pro-rules,
  searched `research finance dashboard minimal` and retried with
  `internal analytics dashboard`. Minimalism / Swiss style and interaction rules fit.
  Newsletter / enterprise marketing sections did not fit this private app, so those
  recommendations were rejected; composition follows Taste's app-specific ledger.

These sources were consulted as design guidance. No plugin, external runtime,
tracking, paid subscription, animation package or upstream code installer was added.
The scripts ran from temporary clones; their contents are not vendored in the app.

## Decisions

- Self-hosted variable Noto Sans Georgian, including its SIL Open Font License in
  `public/fonts/`. Downloaded from google/fonts; no browser request to a font CDN.
- Shared semantic tokens in `src/app/globals.css`, light by default, optional dark
  theme stored only in browser localStorage under `arbitrage-theme`.
- Grouped labelled sidebar; tablet/phone menu expands in normal document flow,
  with `aria-expanded`, Escape-to-close and focus return. No focus-trapping overlay.
- Landing / login combined at `/login`; protected home remains `/`. Password-manager
  and native form support preserved. No private data rendered on the public screen.
- Tables remain scrollable within their frames. Financial inputs become labelled
  rows on narrow screens; fields, statuses and notes retain their names and meaning.
- No charts without useful real data, gradients, glows, autoplay or entrance motion.
- Long explanations and JSON imports use disclosures; required confirmations remain
  visible before actions. Existing actions, calculations and authentication retained.

## Verification

`CHROMIUM_PATH=/usr/bin/chromium node --import tsx scripts/check-design-browser.ts`
checks the protected routes at 1440, 768, 390 and 375px widths, captures screenshots,
opens/closes the mobile menu, follows its product link, and verifies theme persistence.
It creates and removes one labelled UI-test product/market and an auth session; it
blocks external requests and all POSTs. It also checks unsaved financial editing without mutating existing costs. Never treat screenshots of that fixture as
real research. Screenshots go to `/tmp/arbitrage-design-after`, not Git.

Before the redesign, Matching overflowed at 768px and 390px. The redesigned routes
fit at all four widths. Review the script and final run output for current coverage.
Use the existing form, auth and product checks to verify behavior alongside layout.
No database migration is part of this change.

The final Taste login inspection has zero failures. Its `app-title-size` rule is
explicitly allowed for the public entrance's two-line editorial heading (not used
for app headings). Its remaining small-text warning concerns secondary captions,
process descriptions and privacy/footer copy at 11–12px, reviewed at each width;
form input text is 14px desktop / 16px phone and regular app body text is 14px.
The test also exercises a complete evaluation's eight metrics using explicit
UI-only values, then removes those fixtures. No live AI or supplier calls validate
this visual change, and none are needed to apply it.

Validation completed: production build and lint; 136 unit tests; 17 routes at four
widths with incomplete and complete evaluation states; real browser form retention
and saves; owner login/logout and origin protection; product pagination/provenance;
private report download; payment scenario calculation; cancellation of supplier
refresh with intercepted requests; offer import and explicit review. All passed.
The review against `0a6c778` found no changes to provider adapters, financial
calculation logic, server actions, authorization guards or database schema.
