# Pending additive environment updates

The environment draft update returned `draft_not_editable`; the following changes
were not confirmed saved. Preserve newer published scripts, repositories, network
policy and existing CJ credentials. Do not automatically publish or replace the
full configuration. This file contains no credentials.

## Optional secret requirement

- Name/target: `EBAY_ACCESS_TOKEN`
- Source: personal/user-provided (`user_provided`)
- HTTPS destination: `api.ebay.com`
- Value: supplied securely in environment settings, never in chat or repository.

This is a production Browse API application token, not a CJ API Key. Production
eligibility and base scope `https://api.ebay.com/oauth/api_scope` must be verified
with eBay. Tokens expire; this connector does not mint or refresh them. Current
provider pricing/quota and approved retention/display rules remain unverified.
The requirement is optional: manual competitor research and CJ do not need it.

## Startup addendum

Use the existing checkout and standard Prisma generate/migrate deploy commands;
ExternalOffer and review relations are additive migrations. Research provides a
bounded offer inbox. At most 20 fixed-price results per explicitly mapped market,
one-minute cooldown, no eBay background requests. All offers need human comparison
before becoming competitor observations. Unknown shipping/taxes stay unknown.
No sales, demand, automatic selling prices or product equivalence are inferred.

Run `npm test`, lint, type/build checks and `npx tsx scripts/check-offers.ts`.
With the production server running, run `npx tsx scripts/check-offers-http.ts`.
These tests use temporary fixtures and never call eBay. Live authorization is
unverified until a real production account request succeeds.

The prior FX extension is documented in README.md and PRODUCT-STRATEGY.md:
Markets can fetch date-scoped NBG references without a new credential; future or
stale rates are rejected and quote applications preserve snapshot provenance.
Use `npx tsx scripts/check-fx-http.ts` with existing current references; optional
`--refresh` makes one actual public request. Do not silently revalue old inputs.

No permanent commercial market has been selected by the operator. Code is backed
up on GitHub branch `codex/product-research-automation`. Saving instructions or
pushing code does not deploy the application or publish an environment snapshot.

## Owner authentication startup addendum

The application now requires owner authentication for every private page and
business mutation. Existing unprotected startup text is superseded by
DEPLOYMENT.md. Local `.env.local` and `/workspace/.cloud-setup/owner-access.txt`
were generated privately; preserve them and never print or commit their values.
If auth has not been configured, `npm run auth:init` creates credentials once and
refuses to overwrite existing files. APP_PASSWORD_HASH must be a literal secure
runtime setting, not a network-proxy credential placeholder. APP_ORIGIN is the
canonical HTTPS public origin (local HTTP only for loopback tests).

Use normal Prisma generate/migrate deploy for OwnerSession/OwnerLoginState.
Run `npx next typegen` after route moves; pages now live in `(protected)` while
URLs are unchanged. `npm test` has 75 tests. `scripts/check-auth-http.ts` verifies
real local login, revocation, expiry, throttling, action/origin rejection and health
without printing credentials. Other HTTP regressions create/clean temporary
sessions and require auth configuration. The Docker image was successfully built
and tested with its own isolated PostgreSQL: migrations, readiness, non-root
execution, absence of env/git/CA-secret files and actual login all passed.

No public hosting account, production database, domain, registry upload or public
deployment is configured. There are three remaining deployment operations in
DEPLOYMENT.md. Do not invent hosting credentials or purchase resources. Do not
publish this environment or overwrite newer configuration automatically.
