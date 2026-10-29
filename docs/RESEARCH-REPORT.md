# Download a research report

Open an Opportunity and click **Download research report (.txt)**. The UTF-8
plain-text file opens in Notepad or any text editor. It uses the application's
English field names. It is a research snapshot, not a product publishing file,
a database backup, or an AI recommendation. No credential or extra package is
required, and no external provider call is made.

The report includes product notes, linked supplier catalogue prices and reviewed
identifiers, each market's current saved inputs and calculations, advertising
cost scenarios when inputs are complete, evidence and manually reviewed competitor
observations. Each input retains its status and note. Money is displayed in its
own currency; percentages use their display values, not basis-point integers.
Markets are never aggregated or selected by the export. A product with no market
evaluation still exports its recorded research and explicitly unknown economics.

Missing essential costs prevent an after-ad result. Where other required costs
are known but CAC is missing, before-ad contribution can be displayed with its
own estimated and zero-assumed inputs. This is not an advertising forecast.
Optional unknown inputs counted as zero are disclosed. Contribution excludes fixed
overhead and business income tax. VERIFIED describes the operator's input status;
it does not certify the underlying source. Demand, actual acquisition costs and
fulfilment still require business validation.

Evidence preserves source URL, market scope, provenance, outcome, observation,
expiry and retirement reason. Expired/retired records remain in the report but
cannot satisfy current evidence readiness. Competitor observations preserve match,
shipping unknowns and tax basis; no sales or recommended prices are inferred.
Unreviewed provider offers, supplier variants/quotes and their histories, catalogue
price history, financial edit history and identity/link audit history are outside this first report.
The original records remain in the database.

The download requires a valid owner session directly in its route handler, and
uses private/no-store caching, attachment disposition, a numeric-ID filename and
plain-text/nosniff headers. It is not HTML or spreadsheet CSV. Downloaded files
include private research notes and URLs: review before sharing. The snapshot is
read under PostgreSQL Repeatable Read and does not update any business records.
Limits are 100 evaluations, 500 linked listings, 2,000 evidence records, 2,000
competitor observations and 5 MB output per opportunity. Exceeding a limit refuses
the entire download; it never silently emits a partial report. Dates inside the
file are explicitly UTC snapshots, not promises of current provider availability.

## Update an existing Windows installation

Stop the app with Ctrl+C. Inside `C:\Users\temof\arbitrage-finder-local`:

```bat
git pull --ff-only origin feature/product-research-automation
npx prisma generate
npx prisma migrate deploy
npm.cmd run dev -- --hostname 127.0.0.1
```

This feature adds no migration or environment variable. The generate/deploy steps
also support a checkout that has not yet received the earlier Matching update.
Existing local `.env`, `.env.local` and database data are preserved.

## Validation

86 unit tests, lint/types and production build pass. Unit checks cover known
contribution, unknown CAC, separate currencies, evidence expiry/retirement,
control-character handling and all record-count bounds. With the production app
running locally, `node --import tsx scripts/check-report-http.ts` checks owner
access, response headers, invalid/missing IDs, no-evaluation export, recorded
sources/provenance, incomplete and complete results, absence of write side
effects and refusal above the listing limit. Its uniquely tagged fixtures are
removed. No real commercial market or competitor data is fabricated or retained.
