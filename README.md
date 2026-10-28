This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

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

This remains a private single-operator application; bind locally. Public hosting
requires authentication and authorization. No Shopify connection, publication,
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
