# Personal product-research tool: implementation review, 2026-10-30

This is a single-owner decision-support tool, not a SaaS. No selling channel,
merchant account, registered business or production store is assumed.

## Confirmed implementation

- Discovery: CJ catalogue import/search, price observations, explicit promotion
  to saved products. Variant/stock reports and immutable shipping estimates.
- Matching: sourced identifiers with explicit link review and revisions.
- Research: manual competitor observations, source links, market-specific evidence
  and expiry/retirement. Optional eBay Browse adapter and human review inbox already
  exist; they require the user's production eligibility/token. Website links are
  not automatic data collection. No new competitor connector was needed here.
- Economics: deterministic calculator, required-unknown handling, assumptions,
  currency separation, scenarios, explicit quote application, financial history,
  conflict protection, private report export and offline store-draft preparation.
  Reported contribution excludes fixed overhead and business income tax; this is
  not a complete accounting net-profit model or universal tax engine.
- Automation: paused-first bounded CJ discovery worker exists. It is not an
  end-to-end autonomous competitor/demand research service.
- AI: OpenAI/Gemini adapters exist. User asked to postpone activation; no live AI
  access or end-to-end model quality is established by mocked tests.

## Missing bridge completed in this change

Saved competitor prices were summarized but not connected to saved product costs.
Read-only low/median/high price scenarios now use the existing calculator on the
product evaluation and market-selected Research pages. Exact and equivalent
products are separated. Currency/tax basis must match, shipping must be known,
and sources must be current. Newest observations replace older ones per source
URL, including when the newest one is no longer comparable. Delivered customer
price is modeled as sellingPrice with shippingCharged=0, without changing stored
inputs. Unknown required costs still prevent a contribution figure.

The source population is explicitly bounded to the page's loaded observations;
its range is not a market census or an estimate of achievable sales prices.
No sources, prices or evidence are fabricated or automatically promoted.

## Validation and limits

122 unit tests and the production build passed. Authenticated HTTP checks verified
scenario rendering on both pages and unchanged saved CostInput/FinancialChange
records using disposable fixtures. Existing product workspace checks also passed.
No migration, dependency, subscription or live provider/AI request was introduced.

## Remaining priorities

1. Validate one actual product/variant and selected destination with current
   supplier, delivered cost, comparable retail observations and the user's fees.
2. Expand permitted competitor data ingestion only where access, reuse terms and
   cost have been checked; do not scrape indiscriminately or assume free access.
3. Connect those real sources into a bounded refresh/review workflow. Product
   matching, demand verification and taxes still require review; a catalogue price
   spread alone is not profit or demand.
4. Resume the first Gemini live test when the owner is ready. Existing adapters
   need not be rebuilt. No model subscription is needed for these price scenarios.
