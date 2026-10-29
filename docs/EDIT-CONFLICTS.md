# Concurrent edit protection

Financial input forms, market assumptions/destination/tax settings, and sourcing
quote application now carry an explicit database version. A submission from an
older page is refused before any business input or route invalidation is saved.
A conditional update under the existing PostgreSQL transaction lock gives one
winner to two simultaneous requests with the same baseline. Failed saves roll
back the version change along with business writes.

In hydrated forms, typed fields and notes remain after a conflict. **Open latest
saved version in a new tab** opens the current record while retaining this tab for
comparison. Review the new values and transfer intended edits into the fresh tab.
There is no force-overwrite or automatic merge. Repeating the old submission stays
blocked. Successfully saving advances this form's own baseline so further edits
in that tab work without reloading. Unrelated server-render updates never silently
advance the baseline of dirty uncontrolled fields. Without JavaScript, normal
server form behavior applies; use a fresh page to obtain the latest version.

Market destination changes and tax-inclusion changes increment versions of their
related evaluations because their calculation context changed. Destination-change
invalidation still occurs atomically, only after a successful market claim.
Sourcing application increments the evaluation version and rejects stale public
quote forms; old manual forms cannot undo a newer applied quote either. Existing
privileged internal tooling can still call the low-level quote helper without a
version; the public server action always requires an explicit version. Direct SQL
or external writes are not protected by these app-level counters.

The additive migration adds `version` integer columns to Market and Evaluation,
with existing records initialized to zero. Data is preserved. Update the laptop:

```bat
cd C:\Users\temof\arbitrage-finder-local
```

Stop the app first with Ctrl+C, then:

```bat
git pull --ff-only origin codex/product-research-automation
npm.cmd ci
npx prisma generate
npx prisma migrate deploy
npm.cmd run dev -- --hostname 127.0.0.1
```

Keep normal backups. Do not reset the database. Old pages without edit metadata
are rejected; reopen them after updating. No new credentials or provider calls are
needed. Financial edit history is now captured separately; see FINANCIAL-HISTORY.md for
coverage and parent-record retention rules.
Other flows such as evidence entry, competitor review and owner sign-in retain
their separate validation; they are not all made versioned by this change.

Validation: 98 unit tests, type/lint/build checks, real concurrent authenticated
HTTP submissions and two-tab Chromium regressions. Tests cover missing versions,
one-winner saves, stale input retention, repeated conflict attempts, own-baseline
advancement, market route/tax invalidation, stale quotes in both directions and
no losing-request invalidation of evidence/costs. Fixtures and sessions are removed.
Both new integration scripts run in GitHub CI with an ephemeral PostgreSQL service.
