# Arbitrage Finder

Private product discovery and contribution research app. For laptop setup, use
[Windows / local PostgreSQL instructions](docs/LOCAL-SETUP.md). The app requires
owner sign-in; keep local development on `127.0.0.1`.

## Product research workflow

See [business model, source research and phased roadmap](docs/PRODUCT-STRATEGY.md).
The first implementation adds `/discovery`, price observations and source-backed
research records while reusing existing product-market evaluations.

From the checkout, with the existing safe `DATABASE_URL` (`arbitrage`) and
`SHADOW_DATABASE_URL` (`arbitrage_shadow`) configured:

```sh
npm ci
npx prisma generate
npx prisma migrate deploy
npm test
npm run lint
npx tsc --noEmit
npx tsx scripts/check-discovery.ts
npm run build
npm run dev -- --hostname 127.0.0.1
```

The integration check uses temporary uniquely identified fixtures and cleans them
up; it never resets the database. Do not run `prisma migrate reset`.

Discovery accepts authorised JSON arrays (up to 100 records / 250 KB). Fields:
`provider`, `externalId`, optional `variantId`, `name`, `url`, `currency`,
`priceMinor` (integer minor units or null), and `observedAt` (past ISO timestamp
with timezone). Supported currencies are USD/EUR/GBP/CAD/AUD/GEL. Observation
identity is provider + externalId + variantId; keep variant IDs stable. Imported
prices are catalogue indications, not verified quotes. Importing the same
observation is idempotent; conflicting timestamps or stale updates reject the
whole batch. Only select candidates for further research after checking them.

Use the prepared Node.js 24 runtime for managed-proxy support (native
`setGlobalProxyFromEnv`); TLS verification remains enabled.

CJ discovery uses the documented `product/listV2` endpoint, at most 20 candidates
per search. Set `CJ_ACCESS_TOKEN` securely in the server environment (accepts a CJ access token or API Key); never enter
it in chat, catalogue JSON or source URLs. API Keys are exchanged through CJ’s official authentication endpoint after an
authentication rejection. The derived access token is cached in process memory
for at most one hour (or until shortly before its expiry); it is never written
to disk, logs, the database or the browser. No orders are placed. A missing/expired token yields a clear status.
Authentication/quotas/terms must be checked with the actual supplier account.

This remains a private single-operator application with owner sign-in; bind locally.
Public hosting also requires the deployment checks in docs/DEPLOYMENT.md. No Shopify connection, publication,
paid advertising or supplier order is performed by this implementation.

With the production server running locally, verify form submissions end to end:

```sh
npx tsx scripts/check-discovery-http.ts
```

This creates and removes temporary catalogue/evidence fixtures through the real
forms. It is a local verification tool, not a supplier discovery run.


## Exact variants and shipping estimates

From a directly received CJ candidate, open **Variant prices & shipping estimates**.
Refresh variants, then configure a destination country in **Markets** when you
choose a market. Market display codes are not automatically treated as countries.
Select a positive-stock reported origin, market and representative postal code.
The quote is for one unit; no order or customer address is needed. Shipping
estimates can omit additional costs and are not guaranteed delivery dates.

Product and shipping timestamps are retained separately. Quotes expire under a
24-hour application freshness policy. Applying one requires confirmation and a
matching product/market. It fills only estimated product and shipping costs and
clears duty/handling inputs for review. For non-USD markets, supply a recent FX
rate (target units per USD), source and date; it is an assumption, not a live feed.
Changing destination invalidates previously applied CJ route estimates.

```sh
npx tsx scripts/check-sourcing.ts
# With the production app running locally:
npx tsx scripts/check-sourcing-http.ts
```

These checks use temporary, clearly labelled fixtures and clean them up. Optional
`--live-freight` on the HTTP check makes one real, read-only CJ request using an
already refreshed real variant. It creates a temporary technical destination,
then deletes that destination and its estimates. It requires configured CJ access
and respects the shared 30-second CJ cooldown. It does not select a business
market. Do not run live checks repeatedly as part of an ordinary unit test suite.

## Competitors, demand review and shortlist

Open **Research** after selecting candidates for investigation in Discovery.
Choose a market only when ready. Record comparable competitor offers with source,
match explanation, integer minor-unit prices, shipping (blank means unknown),
tax basis and UTC dates. Price summaries separate currency/tax basis and use the
latest source observation. Displayed offers do not prove sales, and no selling
price is copied automatically. Research links open official tools; no automated
competitor or demand feed is connected. Record sourced demand/advertising/risk
claims on the product detail page, then review/retire them in Research with a
reason. Retired records remain visible and no longer affect readiness.

With the production server running locally:

```sh
npx tsx scripts/check-research-http.ts
```

The check creates/removes only its own temporary products, markets and research.

## Bounded recurring CJ discovery

Open **Automation** and create a product-phrase schedule. It is paused by default;
explicit confirmation is required to enable recurring external requests. No
schedule, category or destination is selected on your behalf.

```sh
npm run discovery:worker -- --dry-run  # Read-only due-job inspection
npm run discovery:worker -- --once     # At most one due attempt
npm run discovery:worker               # Poll every 30 seconds, until stopped
```

Run the worker separately from the web server, using the same prepared Node 24,
proxy, database and credential environment. Publication/restoration does not
preserve processes; restart the worker in future runtimes. A last-check timestamp
on Automation is evidence of a tick, not a guarantee a process is still alive.
Keep development bound to loopback; public/multi-user deployment needs auth.

Limits: at most five enabled schedules, every 6–168 hours, one page of up to 20
newest matching products per attempt, at most 20 scheduled attempts per UTC day.
Failures/cancellations/interrupted attempts count toward that limit; cooldown-only
deferrals do not. Manual searches have separate controls. Auth may add two HTTP
requests per attempt. These application limits do not establish provider fees or
account entitlement. New products beyond the first page can be missed; this is
not an exhaustive catalogue crawl. No shipping or demand enrichment runs in the
background.

Workers claim a two-minute database lease; imports and execution completion are
atomic and fenced by that lease. A paused schedule invalidates an in-flight
result. Expired workers are recovered with delayed retry. Network/validation
errors back off from 15 minutes up to 24 hours; rate limits wait at least an hour.
Authentication errors pause immediately; five consecutive other failures pause
until explicit re-enabling. Provider response bodies and credentials are not
stored in execution logs. Provider account costs are not calculated by this worker; confirm current CJ
fees and credits before enabling a schedule. Shutdown signals finish an active
attempt gracefully; use Pause to prevent an in-flight result from importing.

```sh
npx tsx scripts/check-automation.ts
# Web server running, worker stopped:
npx tsx scripts/check-automation-http.ts
```

The database check refuses to run with enabled operator schedules, uses mocked
provider data and cleans its jobs/candidates/audit fixtures. The HTTP check
briefly enables a temporary test schedule, so workers must be stopped. Neither
check calls CJ. Keep the ordinary unit suite independent from live credentials.

## Official reference currency rates

In **Markets**, use **Fetch current official rates**. The app requests the National
Bank of Georgia's date-scoped public JSON feed for the current Georgian calendar
date. No new API key or paid provider is needed for the verified request. One
refresh attempt is allowed per ten minutes; failed refreshes preserve existing
snapshots. There is no background FX polling and no HTTP fetch inside the quote
application transaction.

The feed expresses GEL per currency quantity. The app honours each quantity and
derives target-currency units per USD using exact decimal arithmetic, rounded to
eight decimal places. Supported targets are USD/EUR/GBP/CAD/AUD/GEL. This choice
of rate source does not select Georgia, or any country, as a business market.
Future-effective, stale, inconsistent or incomplete feeds are rejected; future
published rates are not treated as effective today. Rates are reference estimates,
not executable bank prices; add payment conversion fees/spread separately.

When applying a non-USD sourcing quote, select a saved official reference, or
complete the manual rate/source/date fields. Snapshot currency, provider and
seven-day effective-date window are checked server-side. The input notes preserve
the snapshot identifier, rate, effective date and official URL. Existing
calculations do not change automatically when new rates arrive. Manual FX remains
available when the source is unavailable. No financial inputs become VERIFIED
merely by using an official reference.

```sh
# Production server running; requires already saved current reference snapshots:
npx tsx scripts/check-fx-http.ts
# Optional ONE live public feed request plus cooldown check:
npx tsx scripts/check-fx-http.ts --refresh
```

The FX HTTP check removes its own temporary products/quotes/market, retaining
only real official rate snapshots. The existing sourcing integration check also
covers wrong-currency and stale snapshot rejection and manual fallback.

## Optional eBay competitor offers

Research can fetch one page of up to 20 fixed-price offers from the production
Browse API for an explicitly selected destination. Supported country/currency
pairs: US/USD, GB/GBP, DE/FR/IT/ES/EUR, CA/CAD, AU/AUD. No default country is used.
This optional provider requires production account eligibility and an application
access token with `https://api.ebay.com/oauth/api_scope`; configure it securely as
`EBAY_ACCESS_TOKEN`, scoped to `api.ebay.com`. It is not a CJ credential. No token
is currently configured and no real eBay offer fetch has been validated. Tokens
can expire; automatic OAuth token minting/renewal is not implemented.

Official requirements and approved data-use/retention/display conditions must be
checked for the actual application before enabling live collection. Current fees
and quota were not independently established. The connector makes no scheduled
requests and has a one-minute cooldown. It never stores upstream error bodies or
credentials. Existing manual competitor entry and CJ functions remain available.

Offers arrive pending and cannot affect comparable-price summaries until explicit
human review. Check exact model, dimensions, pack size, condition and delivery.
Shipping/tax values are deliberately unknown unless confirmed. An accepted offer
is a displayed-price observation, not sales or demand evidence, and never fills
selling-price assumptions automatically. Re-fetching expires the previous accepted
observation and requires review again. Changing destination expires prior market
comparisons and invalidates the offer inbox. The 24-hour review window is an app
freshness rule, not a provider retention licence or availability guarantee.

```sh
npx tsx scripts/check-offers.ts
# With the production server running:
npx tsx scripts/check-offers-http.ts
```

These checks use clearly labelled fixtures, remove them afterward and do not call
eBay. See docs/ENVIRONMENT-HANDOFF.md if the environment draft is uneditable.

## Owner sign-in and deployment

Private pages and mutations now require an owner session. Run `npm run auth:init`
once for local setup; it preserves existing files and writes the generated
credential only to the private file path reported by the command. Do not commit
.env.local or copy the local origin into a public deployment. There is no default
password and no unauthenticated development bypass.

Use [the deployment runbook](docs/DEPLOYMENT.md) for required environment settings,
Docker build/release/web/worker commands and validation. /api/health reports
readiness without exposing configuration. Public hosting/account/production DB
configuration remains an external prerequisite; the app is not publicly deployed.

`npx tsx scripts/check-auth-http.ts` verifies the local sign-in flow. Existing HTTP
regression scripts now authenticate with temporary test sessions and remove them;
they do not bypass authorization in application code.

## Run on your own laptop

Start with [LOCAL-SETUP.md](docs/LOCAL-SETUP.md). It includes Windows PowerShell
setup, safe local database creation and portable owner-password file paths.
No online hosting is necessary. The latest complete code lives on branch
`codex/product-research-automation`. Preserve any existing local project/database
before updating, and never reset your database to resolve setup errors.

## Reviewed supplier matching

`/matching` compares sourced GTIN or brand/MPN, checks pack and variant, and links
one unlinked supplier listing to existing research only after owner review.
Conflicts, incomplete specifications and duplicate research targets block linking.
History and an explicit undo are available; costs, prices and evidence stay intact.
See [workflow, limits, laptop update and validation](docs/MATCHING.md). No new
credential or provider call is needed.

## Downloadable research snapshot

Each Opportunity has **Download research report (.txt)** for current market
calculations, stored inputs, sources, evidence and competitor observations.
Unknowns, expiry/retirement and input assumptions remain explicit. No provider
call or database write is made. See [usage, limits and laptop update](docs/RESEARCH-REPORT.md).

## Local database backup

Run `npm run db:backup` from the checkout to create a private PostgreSQL custom
archive outside the project, with a SHA-256 manifest and archive-index check.
Use `-- --pg-bin "path/to/PostgreSQL/bin"` when tools are not on PATH. Local
credentials come from the app settings, never CLI arguments. Read
[Windows commands, included data and restore rehearsal](docs/LOCAL-BACKUP.md).
Code and local settings must also be preserved separately.

## Offline store draft preparation

Each Opportunity now links to **Prepare a store draft** for owner-reviewed
customer text and a JSON review file. No Shopify account is contacted.
See [workflow, limitations and verification](docs/STORE-DRAFT.md).

## Georgia / US feasibility study

`/market-study` shows the owner a dated 2026-10-29 comparison using two real
CJ variants and representative GE/US postcodes, with unknown tax, payments and
profit left explicit. It does not perform live requests on page view. See
[findings, sources and next commercial checks](docs/research/GE-US-2026-10-29.md).

Follow-up research adds [verified retail price references and local sourcing leads](docs/research/GE-US-SHORTLIST-2026-10-29.md), with match differences and unknown wholesale/payment terms kept explicit.

## Automated quality checks

GitHub Actions validates pull requests and working-branch pushes using a fresh
PostgreSQL database, unit/build checks and protected HTTP workflows. It requires
no production secrets and performs no deployment. See [checks and limits](docs/CI.md).

Shared business forms now preserve entered values through validation/network
failures and prevent simultaneous duplicate clicks. Product/evaluation creation
is atomic. See [behavior and browser regression checks](docs/FORMS.md).

Finance inputs, market settings and quote application now reject older edit
versions instead of overwriting newer saves. See [concurrent edit behavior and
laptop migration instructions](docs/EDIT-CONFLICTS.md).
