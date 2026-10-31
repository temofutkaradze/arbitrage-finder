# Arbitrage Finder

A private product-research workspace for comparing supplier offers, competitor prices and the economics of selling a product in a specific market. It helps a single owner decide **what needs more research and which opportunities may justify a limited sales test**.

Start with a supplier candidate, check its exact variant and delivery route, collect dated evidence, calculate costs, and optionally ask AI to summarize the saved research. Keep assumptions visible before committing money.

## Quick start

For an existing, configured installation with PostgreSQL running:

```cmd
cd /d C:\arbitrage-finder
npm run dev -- --hostname 127.0.0.1
```

Open **http://127.0.0.1:3000**, sign in, and open **Discovery** to find a candidate or **My products** to continue saved research. The path above is an example; use your checkout folder. Keep the terminal open; `Ctrl+C` stops the app.

### Start with a double-click on Windows

After initial setup, double-click **`start-local.bat`** in the checkout. It checks Node, local authentication, port 3000 and PostgreSQL, starts the site in one CMD window, waits for readiness, starts the research worker in another window when `RESEARCH_JOBS_ENABLED=true`, and opens the browser.

Keep both CMD windows open. Use Ctrl+C in each to stop them. A second launch refuses to start while port 3000 is occupied. The launcher does not install packages, apply migrations or change environment files. PostgreSQL must already be running; it reports a failed connection rather than choosing or starting an unrelated Windows service. Scheduled discovery remains a separate opt-in worker.

## What the app does

- Searches the CJ catalogue and saves candidates for investigation.
- Retrieves provider-reported variants, inventory and route estimates.
- Organizes competitor observations, source dates and product-match decisions.
- Calculates per-order contribution, break-even figures, target acquisition cost and business scenarios.
- Runs small refresh batches and optional scheduled CJ searches.
- Produces optional AI drafts from saved evidence and downloadable research snapshots.

It does not independently browse the whole internet, prove demand, certify product identity or guarantee profit. It does not place orders, publish store listings or launch advertising. Active listings and catalogue inventory are not evidence of completed sales. The interface includes Georgian and English labels; this guide is in English.

## Contents

[Setup](#run) · [Updates](#update) · [Research](#research) · [Automation](#automation) · [AI](#ai) · [eBay](#ebay) · [Data formats](#data-formats) · [Backup](#backup) · [Troubleshooting](#troubleshooting) · [Development](#development) · [Deployment](#deployment) · [Structure](#structure) · [Credits](#credits-and-provenance)

## Run

### Existing installation

Use the quick-start commands. PostgreSQL must be running; pgAdmin does not need to be open. Check Windows services with:

```cmd
powershell -NoProfile -Command "Get-Service *postgres* | Select-Object Name,Status"
```

The initial setup creates the owner password. For installations using the setup helper, look for `owner-access.txt` in `%USERPROFILE%\.cloud-setup`. Moving the checkout does not move this external file. Never upload passwords or environment files.

### New computer

Requirements: Git, Node.js 24+, PostgreSQL and access to your repository.

1. Clone the repository into your chosen folder.
2. Review `scripts/setup-local.ps1`, the target database and planned changes.
3. Back up existing data before running setup. **The setup script prepares databases and applies migrations.** It is not the everyday startup command.
4. Configure local credentials securely and start the application.

`npm ci` installs locked dependencies. `npx prisma generate` generates the client without changing database records. Review and approve database migrations separately before executing them.

## Update

Stop the app, then run in your checkout:

```cmd
git pull --ff-only origin master
npm run dev -- --hostname 127.0.0.1
```

- Use your working branch instead of `master` when appropriate.
- If `package-lock.json` changed, run `npm ci` before restarting.
- Stop on conflicts; do not force-reset or blindly overwrite files.
- A pull does not apply database migrations. Review those separately.
- GitHub synchronizes code, not database records, `.env.local` or passwords. Cloud and laptop databases are separate.

### Moving an older checkout

`scripts/move-to-main-folder.ps1` moves a complete working clone and preserves an existing destination under a unique backup name. Stop the app and worker, close editors, and run it from outside both folders. Preview with `-WhatIf` first. It does not change the database or merge environment files. Do not rerun after a successful move; keep the backup until you have verified the result.

## Research

### Pages

| Page | Purpose |
|---|---|
| Overview `/` | Saved products, evaluations and next steps |
| Discovery `/discovery` | One CJ search page, up to 20 candidates; catalogue JSON import |
| My products `/products` | Saved products, progress and supplier records |
| Evaluations `/opportunities` | Product-and-market costs, contribution and scenarios |
| Research `/research` | Competitors, evidence and pending offers |
| Matching `/matching` | GTIN or brand/MPN checks, reviewed variant/pack links and undo |
| Markets `/markets` | Destination country, currency and tax interpretation |
| Automation `/automation` | Small refresh batches and optional CJ schedules |
| History `/history` | Previous and new financial values |
| Payments `/payments` | Reference payment-fee scenarios |
| Market study `/market-study` | Dated initial research, not live market monitoring |

### Typical workflow

1. Find a candidate and choose **Investigate this candidate**.
2. Choose a market and confirm the exact variant, pack and shipping route.
3. Collect competitor observations and dated evidence.
4. Enter costs and review unknowns, contribution and business scenarios.
5. Optionally preview the saved evidence packet and request an AI draft.
6. Download the research for review.

The app does not choose a country, category or selling price for you. A market display code is not automatically treated as a destination country code.

### Financial status and evidence

- `UNKNOWN`: missing information; essential unknowns block a complete calculation.
- `ESTIMATED`: an assumption or provider estimate.
- `VERIFIED`: a user-assigned status, not independent certification.
- Optional unknown costs may be treated as zero; the result identifies these assumptions.
- Per-order contribution includes entered variable costs and advertising, but excludes fixed overhead and income tax. It is not full accounting net profit.

Applying a CJ quote requires confirmation. It replaces estimated product/shipping inputs and clears duty/handling for review. Currency conversion requires an explicit FX direction, date and source. The 24-hour freshness rule is an app review policy, not a supplier price guarantee; inventory reports do not reserve stock.

For EXACT/EQUIVALENT competitor comparisons, check colour, size, pack, condition, shipping and tax basis. Different currencies are not added together.

Forms retain entered values on errors. Stale concurrent saves are blocked: load the latest version and compare. Financial changes and their history are saved transactionally. Deleting a product or market can delete its associated history; use database backups for long-term retention.

### Business decision rules

1. **Verify feasibility:** exact product identity, delivered cost, delivery time, returns, selling restrictions and payment eligibility. Unconfirmed identity stays UNCERTAIN; compare alternatives as separate products.
2. **Model the economics:** fill essential unknowns and review optional zero assumptions. Competitor prices are scenarios, not proof of an achievable selling price. Taxes and fees must match the country, legal status and provider agreement.
3. **Check profit and cash:** open the business-planning panel on an evaluation or batch review. Planning fields start blank and are temporary; they are not saved. Daily/monthly order counts are scenarios, not demand forecasts.
4. **Test within a limit:** agree a maximum loss, duration and measurable outcome before spending. Measure actual acquisition cost, fulfilled orders, returns and received cash. Spending requires separate owner approval; the app does not activate a sales test. Scale only with supporting results and sufficient cash.

### Planning formulas

**Target CAC** = contribution before advertising − allocated fixed overhead − per-order uncertainty buffer − target profit.

- CAC means customer acquisition cost per order.
- Target profit uses revenue excluding sales tax and the selected target margin.
- Ordinary break-even CAC excludes the target profit and fixed overhead.
- A negative target CAC means even zero advertising cost cannot meet that target.
- Results exclude income tax. Allocated overhead rounds upward to the smallest currency unit; monthly scenarios use that conservative allocation.

The joint stress scenario applies selling price −5%, supplier and shipping +10%, CAC +25%, and returns +2 percentage points, capped at 100%. These are hypothetical sensitivity assumptions, not probabilities or universal business thresholds. Zero CAC remains zero under a percentage increase.

The liquidity illustration prefunds modeled variable costs during payout delay, a full month of fixed overhead and an additional reserve. It is not an actual peak cash-flow forecast. Review rolling reserves, tax payment timing, payout schedules, blocked funds and refund timing separately. Reserved cash is not automatically an expense.

Avoid double counting:

- Add only the monthly minimum fee shortfall above fees already modeled.
- Do not repeat per-order costs in fixed overhead.
- Return losses should reflect refunds and additional nonrecoverable costs, less recoveries; the original supplier and shipping costs are already counted.
- Return, chargeback and damage assumptions must not count the same loss repeatedly.

## Automation

### Refresh batches

- Select 1–3 distinct saved CJ candidates from the latest 100 records.
- Refresh variants/inventory and up to three distinct saved routes from the latest 100 quotes per candidate.
- CJ operations are spaced 31 seconds apart; one operation may use several endpoint/auth requests.
- Missing routes are blocked; destinations and ZIP codes are not invented.
- New prices are not automatically applied to financial inputs.

An optional eBay stage requires an explicit marketplace and an existing product evaluation for it. It searches by catalogue name, returns up to 20 results and uses a separate 61-second interval. Missing access or incompatible markets block requests. After an eBay error, remaining eBay searches are skipped while CJ work continues. Refreshed offers require renewed review.

**Stop** or closing the page prevents subsequent steps; an in-flight request may still save its result. The log belongs to the current page, with no durable background resume. Restarting makes new requests.

### Combined review and AI

The combined review shows current saved data for up to three products: up to 20 evaluations, the latest 30 evidence records and 100 competitor observations per product. It is not an immutable run log or a complete market survey.

A financial market filter does not filter the AI packet: other markets for that product may be included. Preview the full packet before consent. Pending offers are excluded.

### Background research

The optional `/automation/jobs` queue stores up to three selected candidates and their saved route steps in PostgreSQL. It supports one active job, explicit cancellation, and the latest 20 job histories. Unlike the browser batch, it survives closing a tab.

**Installation requires the reviewed `20261031120000_durable_research_jobs` migration.** It adds only `ResearchJob` and its index, without changing existing records. Obtain approval before applying it. Then set `RESEARCH_JOBS_ENABLED=true` in `.env.local`, restart the app, and run the worker separately:

```sh
npm run research:worker -- --dry-run
npm run research:worker
```

Keep the worker machine awake. `--once` processes at most one eligible step. Steps are spaced at least 61 seconds apart; the existing provider cooldowns still apply. Prices are never automatically applied to evaluations, and AI is not called by the worker.

Completed steps are checkpointed. Restarting a worker continues queued steps. An in-flight step whose ten-minute lease expires becomes INTERRUPTED instead of being replayed: inspect saved provider results before creating another job. A provider failure stops this queue, including remaining CJ steps after an eBay failure. Stop prevents subsequent steps; an in-flight request may still save its result. Histories survive deletion of a source product and may then contain unavailable links. The page updates when refreshed; it is not live streaming.

The feature is disabled by default and must remain disabled until the migration and database integration checks have passed. Existing browser batches remain available.

### Scheduled discovery

Schedules start paused. Up to five may be enabled, with intervals of 6–168 hours. Run the worker in a separate terminal:

```cmd
npm run discovery:worker -- --dry-run
npm run discovery:worker
```

The web server alone does not execute schedules. Review displayed limits and provider account terms before enabling live requests.

## AI

### Configure a provider

Add settings only to local `.env.local`, preserving existing authentication/database settings. Restart after changes.

```dotenv
AI_PROVIDER=gemini
AI_RESEARCH_ENABLED=true
AI_RESEARCH_MODEL=YOUR_AVAILABLE_MODEL_ID
GEMINI_API_KEY=YOUR_PRIVATE_KEY
```

Use the exact available model ID from [AI Studio](https://aistudio.google.com/), without the `models/` prefix. Local format checks do not prove API access. Review [Google's terms](https://ai.google.dev/gemini-api/terms) and [pricing](https://ai.google.dev/gemini-api/docs/pricing); free access is not guaranteed.

To switch to OpenAI without code changes:

```dotenv
AI_PROVIDER=openai
AI_RESEARCH_ENABLED=true
AI_RESEARCH_MODEL=YOUR_AVAILABLE_MODEL_ID
OPENAI_API_KEY=YOUR_PRIVATE_KEY
```

Choose an accessible Responses/structured-output-compatible model. Only the selected provider is used, even if both keys exist. Other providers require an adapter. Set `AI_RESEARCH_ENABLED=false` to disable research. Legacy provider-specific settings retain their fallback rules; prefer the shared settings above.

### Request and review a report

- AI analyzes saved evidence; it does not search the internet.
- Preview the packet and give separate consent for each product, including possible charges.
- General product notes and account secrets are excluded; cost/evidence notes may contain private information.
- Reports are drafts and do not automatically change costs or evidence.
- Invalid/stale packets, malformed output and unsupported source IDs are rejected. Valid citations do not establish that a conclusion is correct.

### Limits and failures

| Limit | Value |
|---|---|
| Input packet | 100 KB |
| Output | 2,400 tokens |
| Request deadline | 120 seconds |
| Attempts | 10 per UTC day across research requests |
| Minimum interval | 90 seconds |

These are request limits, not a monetary budget. There is no automatic retry or paid fallback to another provider. A failed attempt may still incur provider charges.

## eBay

Obtain production App ID and Cert ID from [Application Keys](https://developer.ebay.com/my/keys), then configure `.env.local`:

```dotenv
EBAY_CLIENT_ID=YOUR_PRODUCTION_APP_ID
EBAY_CLIENT_SECRET=YOUR_PRODUCTION_CERT_ID
```

- eBay must grant production eligibility and quota. Sandbox keys do not work with this adapter.
- Application tokens stay in server memory, refresh 60 seconds before expiry, and concurrent token requests are combined.
- Legacy `EBAY_ACCESS_TOKEN` is supported; a complete client credential pair takes precedence.
- Rejected tokens do not trigger an automatic search retry.
- Supported markets: US/USD, GB/GBP, DE/FR/IT/ES/EUR, CA/CAD and AU/AUD.
- Offers enter a pending queue for manual acceptance or rejection. Review price, shipping and tax; active offers do not prove demand.

See the [Browse API](https://developer.ebay.com/api-docs/buy/browse/overview.html).

For CJ, set `CJ_ACCESS_TOKEN` to your access token or supported API Key. Keep every key server-side; never use `NEXT_PUBLIC_` for secrets.

## Data formats

| Operation | Format and limit |
|---|---|
| Catalogue import | JSON array; up to 100 records / 250 KB |
| Offer import | `{destinationCountry,currency,offers}`; up to 50 / 200 KB; preview and confirmation |
| Research export | Private JSON/TXT snapshot; not an importer or database backup |
| Store draft | Offline DRAFT JSON for review; does not publish to a store |

### Catalogue records

Fields: `provider`, `externalId`, optional `variantId`, `name`, `url`, `currency`, `priceMinor` (integer minor units or null), and `observedAt` (a genuine past ISO timestamp with UTC/offset). For example, 1234 means 12.34. Supported currencies: USD/EUR/GBP/CAD/AUD/GEL.

Conflicting/older observations and duplicates are rejected. Imports are atomic, not partial.

### Offer records

Each offer requires a source URL, title, merchant, minor-unit price, `observedAt` and `expiresAt`. Expiry must still be current and no more than 24 hours after observation. Shipping, tax and acceptance status are determined during review rather than imported. Updated observations return to pending and supersede previous accepted data. Conflicting data at the same source/time is rejected. Older CSV browser-preview files do not match these import formats.

### Research exports

Exports may include private notes: review before sharing. Limits are 100 evaluations, 2,000 evidence records, 500 listings, 2,000 competitor records, 500 variants, 2,000 quotes and 5 MB. Exceeding limits returns HTTP 413 instead of a silent partial export.

AI reports, pending inbox items and audit history are excluded from the snapshot. The JSON does not automatically restore another installation.

## Backup

From your checkout:

```cmd
npm run db:backup
```

`pg_dump` and `pg_restore` must be available. If necessary, specify your actual PostgreSQL tools directory and an external destination; these are example paths:

```cmd
npm run db:backup -- --pg-bin "C:\Program Files\PostgreSQL\17\bin" --output-dir "%USERPROFILE%\arbitrage-finder-backups"
```

- Each unique external backup folder contains `database.dump` and a SHA-256 `manifest.json`.
- The default destination is beside the checkout in its parent directory.
- Schema, business records and migrations are included.
- Sessions/login throttles, role passwords, environment files and other databases are excluded.
- Backups are not encrypted by the helper. Keep a protected copy on a separate disk and credentials separately.

An archive-index check is not a full restore test. Practice restoring a trusted dump into a **new, separate test database**, using pgAdmin Restore or suitable `pg_restore --no-owner --no-privileges` options. Restoring over the working database needs a separate plan and current backup. Never use `prisma migrate reset`.

## Troubleshooting

| Symptom | Check |
|---|---|
| Site does not open | App terminal, port 3000 and checkout folder |
| Database unavailable | PostgreSQL service, local connection settings; do not reinstall/reset the database |
| Lost owner password | Setup-generated `owner-access.txt` outside the checkout; never upload it |
| AI disabled | Four configuration checks on the product AI page; remove `models/` from model ID; restart |
| HTTP 401 / 403 | Credentials and account permissions |
| HTTP 404 | Exact model ID and endpoint support |
| HTTP 429 | Model/project quota and rate limits; another available quota does not rule this out |
| HTTP 5xx | Provider server error; status alone does not identify the cause |
| Timeout | 120-second deadline; not automatically an internet or quota problem |
| Batch blocked | Access, evaluation, country/currency or saved route missing |
| Stale edit | Open the latest saved version and compare before saving |
| Environment Publish fails | Separate cloud configuration issue; not equivalent to GitHub pull |

A support message, screenshot or API response does not independently establish merchant approval, manufacturer identity, safe product use or actual profit.

## Development

```sh
npm ci
npx prisma generate
npm test
npm run lint
npm run build
```

Use a controlled development database. Integration checks create and clean temporary fixtures; do not run them against production. Browser checks require Playwright Chromium or a local executable selected by `CHROMIUM_PATH`.

Examples, alongside a running local app:

```sh
node --import tsx scripts/check-batch-review.ts
node --import tsx scripts/check-ai-research.ts
node --import tsx scripts/check-batch-offers.ts
node --import tsx scripts/check-batch-browser.ts
node --import tsx scripts/check-business-plan-browser.ts
```

`.github/workflows/quality.yml` uses isolated PostgreSQL, fixtures/mocked providers, unit tests, lint, build and HTTP/browser checks. It does not deploy. Local success does not establish hosted CI success or live API quality. Keep paid/live calls out of the ordinary suite. Linux checks do not validate execution of Windows setup scripts.

`AGENTS.md` defines contributor/assistant rules. `.agents/skills/` contains project-specific debugging, code/security review and AI evaluation instructions. These are developer instructions, not product features or activated plugins. See the credits below for provenance; do not automatically replace them with upstream installers or updates.

## Deployment

Public hosting is a separate operational task. Prepare:

- Hosting, a controlled PostgreSQL database, backups and HTTPS.
- Canonical `APP_ORIGIN`, server-side `APP_PASSWORD_HASH` and `DATABASE_URL`.
- A separate shadow database configured through `SHADOW_DATABASE_URL`, appropriate TLS and database roles.
- A reviewed migration plan before applying schema changes.

Authentication uses salted scrypt hashes, HttpOnly/SameSite cookies, expiring/revocable sessions and login throttling. Actions validate the owner and request origin.

The Dockerfile builds a Node 24 non-root runtime. Never put secrets in images or build arguments. Follow managed-environment proxy/CA instructions and keep TLS verification enabled. The web process and optional discovery worker run separately. Preserve database safety guards and never access unrelated databases. Provider, hosting and API access are not assumed free.

## Structure

```text
src/app/                 Pages, server actions and protected routes
src/components/          Reusable UI
src/lib/                 Profit, sourcing, providers, AI, auth and other domains
prisma/                  Schema and migration history; preserve existing migrations
scripts/                 Setup, backup, relocation, worker and focused checks
public/fonts/            Local fonts and license
.github/workflows/       CI
.agents/skills/          Developer instructions
AGENTS.md                Assistant/contributor rules
README.md                Current user and developer guide
docs/research/           Dated data and consolidated research notes
docs/automation/pilots/   Individual pilot JSON results
docs/design/             Design metadata and licenses
docs/skill-sources/       Skill provenance and licenses
```

Historical research is retained in [RESEARCH-NOTES.txt](docs/research/RESEARCH-NOTES.txt). Dated JSON records and acceptance notes describe past observations, not current prices or permanent guarantees. Older instructions remain in Git history; use this guide for current operation rather than old PHASE3 ZIP/migration instructions.

## Credits and provenance

- Project-local skill sources: [revisions and hashes](docs/skill-sources/sources.json), [Matt Pocock license](docs/skill-sources/matt-LICENSE.txt), [ECC license](docs/skill-sources/ecc-LICENSE.txt).
- Design research: Taste Skill revision `12af471f627f866411b4bd785b19646d3672784c` and UI UX Pro Max revision `28b3b8dee8c976df4fa3e94aed4e092ad43fcb03`. Metadata/licenses are in [docs/design](docs/design).
- Local Georgian font license: [public/fonts](public/fonts).

Stack: Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL and Node.js 24. Application version: 0.1.0.
