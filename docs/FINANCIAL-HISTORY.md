# Financial change history

The owner-only **History** page (`/history`) shows financial changes, newest first.
Links on each market and evaluation filter it to that record. It displays the
before/after value, status, note, market currency/context, action source and time
(in Asia/Tbilisi with an exact UTC timestamp). Older records use 50-row keyset
pagination. Raw saved snapshots and quote/FX provenance are available in details.
Nothing is fetched from external providers when viewing history.

## Recorded actions

- Market creation and subsequent assumptions/destination/tax-display saves.
- New evaluations initialized from market defaults, whether created with an
  Opportunity or added later. Re-adding an existing evaluation creates no event.
- Manual financial input saves, including status-only or note-only corrections.
- Owner-confirmed CJ quote application, preserving quote/variant/route/method,
  observation times and FX note. Duty inputs reset to UNKNOWN are recorded too.
- Market destination or tax-display changes affecting existing evaluations.
  Destination changes capture only the CJ-tagged cost invalidation already done
  by the app; manual values are preserved. Default-only changes do not rewrite
  existing evaluations and have only the market-level history event.

A successful no-op save still advances the version and records an event, clearly
labelled as no value/status/note change. Stale or invalid submissions create no
history event. The event and business write use the same PostgreSQL transaction;
if appending history fails, input/version changes and route invalidation roll
back. Unique scope/record/version keys prevent duplicate revision events. Market
changes and affected evaluation events share a correlation ID in their context.

Snapshots retain integer minor-unit money/basis-point rates and input notes.
Evaluation snapshots also store the calculator's result at capture time, including
incomplete results rather than inventing contribution. These saved numbers are
rendered directly, not recomputed by the history page. `contribution-v1` identifies
the current calculator; future formula changes need their own version label.
Neither a VERIFIED input nor the stored calculation independently certifies a
supplier, tax rule, business outcome or demand. Contribution excludes fixed
business overhead and income tax as in the existing calculator.

## Limits and retention

History begins when this feature is installed. There is **no invented backfill**
for previous edits. The first new edit of a legacy record captures its actual
current baseline and the new values. Old code or direct SQL writes outside these
application paths are not automatically audited. Action-source labels describe
workflow, not independent proof of an individual's identity in this single-owner
app. No public API, edit/delete-history UI or restore/undo function is added.

Events follow their parent records: deleting an evaluation (including deleting
its Opportunity) cascades to its history. Deleting a market removes its related
history as well. The delete flow warns about this. Retain database backups for
long-term preservation. History is append-only through normal app code, not a
tamper-proof/legal accounting ledger; a database administrator can change it.
Snapshots contain private research notes/URLs and remain behind owner sign-in.
The current TXT research snapshot does not include this full edit history.

## Windows update

Stop the app with Ctrl+C before updating. From the checkout:

```bat
cd C:\Users\temof\arbitrage-finder-local
git pull --ff-only origin feature/product-research-automation
npm.cmd ci
npx prisma generate
npx prisma migrate deploy
npm.cmd run dev -- --hostname 127.0.0.1
```

The additive migration creates FinancialChange with scope/version constraints,
indexes and parent relations; existing business data is preserved. No new key or
environment variable is needed. Normal database backups include this table.
Never use migrate reset to resolve a migration error.

## Verification

101 unit tests, type/lint and production build checks. The production HTTP test
`scripts/check-finance-history.ts` covers creation, manual/status/note/no-op edits,
rejected-version/invalid-money exclusions, a deliberately forced audit-write
failure with full rollback, stored tax-mode calculations, quote provenance,
selective route invalidation, protected history rendering, filters and pagination.
Uniquely tagged fixtures and their history are removed by parent cleanup.
It is part of hosted CI together with existing two-tab conflict regressions.
