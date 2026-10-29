# Form reliability

Market creation/assumptions, opportunity creation, evaluation creation and cost
editing now use the shared status form. Expected validation, duplicate and
missing-record errors return safe messages. Authentication/origin checks remain
outside recoverable catches; framework redirects are preserved. Storage errors
never return raw database details or connection strings.

Hydrated shared forms dispatch through a guarded transition: fields are retained
instead of React's automatic uncontrolled-input reset. A synchronous per-form
submission guard and disabled pending button prevent repeated clicks while a
request is active. Confirmed successful saves also retain entered fields; product
creation still redirects normally. Separate tabs/manual requests are not globally
idempotent opportunity creation. Existing unique database keys protect market
codes/evaluation pairs; retrying an uncertain create requires checking the record
first. No automatic retry is performed. Before hydration/without JavaScript,
normal server form behavior still applies; retention is a browser feature.

Opportunity plus selected evaluations are created in a single transaction. A
missing market rolls back all of them. Repeated evaluation creation preserves
existing inputs. Money/count values must fit supported integer bounds and notes
are limited to 2,000 characters; source URLs require HTTP(S) without credentials.
A rejected update does not replace saved cost inputs. Concurrent edits from
separate browser tabs still use the existing save behavior; version-conflict
handling is outside this change. Native download/delete/sign-in forms have their
own flows and are not all converted to the shared component.

A pinned development-only Playwright dependency exercises real Chromium in CI.
It checks invalid/duplicate input retention, synchronous double submit, atomic
rollback, successful redirects, invalid-money preservation and an aborted network
request. Temporary test data/session rows are removed. Existing database/HTTP
checks continue in the same workflow without live provider calls.

Local test, with production app running on 127.0.0.1:3000:

```sh
npx playwright install chromium
node --import tsx scripts/check-forms-browser.ts
```

On this managed Linux executor, an existing browser can be selected with
CHROMIUM_PATH=/usr/bin/chromium. Laptop update: stop the app, git pull, npm ci,
then restart. No migration or new credential is required.
