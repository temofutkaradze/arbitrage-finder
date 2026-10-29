# Product discovery and profit research: operating plan

Status: 2026-10-28. This is a research workflow, not a prediction of sales or a guaranteed profitable business. No country, category, supplier contract or fulfilment arrangement has been selected.

## Business model and decision sequence

Source a product from a validated supplier; sell it through an owned Shopify store; acquire customers through a suitable channel; retain positive contribution after all variable costs and acquisition costs. Monthly operating profit also subtracts subscriptions, staffing and other fixed overhead. Cash required depends on supplier prepayment, payout delays, refunds and inventory commitments. Per-order contribution alone is not monthly net profit.

1. Discover candidates from an authorised catalogue. Record exact identifiers and price observations; a provider's 'trending' or listing-count field is not independent demand evidence.
2. Check seller eligibility and available payment providers for the operator's business location. Shortlist two possible destination markets based on actual shipping quotes, return arrangements, payment eligibility and regulatory complexity. Keep all markets configurable; no country is a default winner.
3. Verify the exact variant, supplier, MOQ, stock, product compliance and intellectual property. Exclude unresolved serious safety/IP concerns from testing. Order a sample of shortlisted products.
4. Confirm fulfilment: single-unit orders, packaging/invoices, processing time, tracking, destination coverage, returns address, lost parcel policy, refunds and support. A catalogue/API does not establish a fulfilment agreement.
5. Research genuinely comparable competitors. Record model, dimensions, materials, quantity, delivered price, delivery time and return policy. An active listing is not evidence of sales; similar-looking products must not be merged automatically.
6. Record demand evidence by market and period. Search trends, review themes and ad creatives are signals with selection bias, not unit-sales estimates. Repeated ads alone do not prove profitable acquisition.
7. Calculate conservative/base/upside unit economics. Prices, shipping, losses and CAC may all vary. Label these as scenarios, not statistical confidence intervals.
8. Run a small sample/store/ad experiment only after human approval of supplier and economics. Set an affordable maximum total loss before spending. Do not derive that loss budget from an invented expected conversion rate.
9. Measure actual delivered cost, click-to-purchase conversion, paid CAC, refunds and cohort contribution after return windows. Increase spending only when the observed economics and cash needs justify it; small samples remain uncertain.

A recurring research process should output a shortlist and the next investigation, not automatically order goods, buy ads, or publish store products.

## Economic definitions

Revenue excludes sales tax/VAT collected on behalf of authorities. Separate tax-inclusive and tax-exclusive prices. Nonrecoverable import VAT is a cost; recoverable import VAT can still create cash-flow requirements. Duty depends on classification, origin, destination and current rules, not just a country-wide default.

Contribution before ads = revenue - product - shipping/fulfilment - duty/nonrecoverable taxes - payment/platform variable fees - expected returns/chargebacks/damage - other variable costs.
Contribution after ads = contribution before ads - CAC.
Break-even CAC = contribution before ads (a nonpositive value leaves no positive paid-acquisition budget).
Target CAC ceiling = contribution before ads - desired contribution per order.
Break-even ROAS = the declared revenue basis / contribution before ads, only when contribution is positive. Compare to platform ROAS only using the same tax/shipping/refund attribution basis.
Monthly operating profit = sum of realised order contributions - fixed overhead. Income taxes require separate treatment.

Avoid double-counting product costs in expected return losses. Specify incremental unrecovered losses, customer refunds, reverse logistics, recoverable stock value and retained processing fees. Distinguish accounting profit from cash needed to fund inventory and advertising.

V1 retains the existing calculator, including its simplified duty basis and return-loss input. It now labels the result contribution after ads, shows before-ad economics when only CAC is missing, and groups financial rankings by currency. Two-decimal currency support is intentionally limited. No automatic FX, tax lookup or jurisdiction-specific tax advice is implemented.

## Evidence and ranking

Each claim records source URL, observation date, expiry, provenance, topic, market and outcome. OBSERVED means an operator recorded a direct observation; the app does not independently certify it. PROVIDER_ESTIMATE and ASSUMPTION cannot satisfy direct-evidence gates. An observation supports only what was actually observed: a competitor's displayed price is not proof customers paid it.

Topics: sourcing, shipping, competition, demand, advertising suitability and product risk. Advertising suitability means a demonstrable benefit and a lawful, supportable creative angle, not a forecast CAC. Global evidence can support sourcing, advertising suitability and product risk; shipping, competition and demand require market-specific records. Expired records cannot satisfy readiness. Documented concerns are escalated even when supporting evidence exists. In V1 concerns remain until their records expire; a reviewed resolution/versioning workflow is a later improvement.

Financial ranking groups by currency, then decision tier, then the selected economic metric. Tiers: review for sample test; promising/needs research; missing economics; loss/risk review. These are workflow groups, not calibrated probabilities. An estimated selling price cannot bypass missing cost inputs or research. The top review tier also requires no optional inputs to be silently assumed zero. Evidence recorded plus positive modelled contribution still does not establish proven demand or profitability. Unknown optional costs are visibly assumed zero by the legacy model and need confirmation before spending.

## Sources checked and integration decisions

Official pages were fetched on 2026-10-28 unless marked otherwise. Public documentation does not prove account eligibility, licensing approval or working authenticated API access. Do not scrape by default. Check source terms, permitted retention, attribution and image rights before commercial use.

| Source / official reference | Useful data / scope | Access, cost and limits | Decision and limitations |
| --- | --- | --- | --- |
| [CJ Product API](https://developers.cjdropshipping.com/en/api/api2/api/product.html) | Catalogue search, USD sellPrice, product IDs, inventory-related fields; listV2 supports keyword/category/price filters | CJ-Access-Token required. listV2 documents size 1–100, page 1–1000 and maximum totalRecords 6000. These are pagination bounds, not a verified daily allowance. Old list endpoint is deprecated; its historical 1000/day note must not be applied to V2 without confirmation. Current account pricing/credits not verified. | First connector uses V2, one page of at most 20 records. Product-level ranges remain unknown, not a cheapest-variant quote. listedNum is listing activity, not sales. No images copied. |
| [CJ Authentication](https://developers.cjdropshipping.com/en/api/api2/api/auth.html) | API key exchange for access/refresh tokens | Docs describe API-key exchange, 180-day token life and 1 QPS on token acquisition. CJ_ACCESS_TOKEN accepts either a token or API Key; a rejected catalogue authentication triggers one official API-key exchange. Derived tokens remain in memory for at most one hour. Actual expiry and entitlement must be checked with the account. | A credential is configured; its API-key exchange was validated on 2026-10-28. Catalogue validation is reported separately below. Never paste credentials in chat or catalogue fields. |
| [CJ Logistics](https://developers.cjdropshipping.com/en/api/api2/api/logistic.html) | Freight estimate by origin/destination, quantity and variant ID; freightCalculateTip supports more precise inputs | Authenticated requests; precise mode needs product properties, weight and route details. Quote pricing/account restrictions not verified. | Implemented simple freightCalculate estimates scoped to exact variant, origin, destination and postal code. More precise freightCalculateTip remains a later option. Quote fields separate shipping, provider taxes and clearance. Delivery estimates are not guarantees; warehouse processing time is not end-to-end arrival time. |
| [eBay Browse](https://developer.ebay.com/api-docs/buy/browse/overview.html) | Listing discovery and lookup for comparison | Official documentation reachable, but current production eligibility, exact quota and commercial-use conditions were not conclusively extracted. No authenticated check. | Optional second provider after access review; not a wholesale supplier-price source or proof of paid-social demand. |
| [Google Trends API announcement](https://developers.google.com/search/blog/2025/07/trends-api) | Official announcement explicitly describes an alpha for search-interest data | Announcement reachable; current admission status/pricing/quotas not established by that historic page. | Do not make MVP depend on API admission. Start with documented manual observations or permitted exports. Relative interest is not orders or absolute demand. |
| [Meta Ads Archive](https://developers.facebook.com/docs/graph-api/reference/ads_archive/) | Ad search/creative research | Docs reachable; token required. Some fields explicitly limited to POLITICAL_AND_ISSUE_ADS. Exact current commercial coverage must be checked by country/use case. | Do not assume access to commercial ad spend, purchases, CAC or ROAS. Manual Ad Library research can complement shortlist review, subject to terms. |
| [TikTok Creative Center](https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en) | Selected auction-ad examples and creative inspiration | Public page reachable and describes Top Ads. No general catalogue-extraction API, licensing or complete market coverage established. | Manual creative research initially. Selected examples are not representative sales data. |
| [DataForSEO Merchant pricing](https://dataforseo.com/pricing/merchant/merchant-api) | Candidate paid provider for shopping/merchant research | Page returned HTTP 403 even after environment access was enabled. Current price, minimum deposit, quota and exact coverage not verified. | Optional capped pilot after pricing/licensing review, not required for V1. |
| [Shopify productCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate) | Product creation through Admin GraphQL | Official docs reachable; store authentication/permissions required. No store credentials or calls used. | Later, optional draft preparation with explicit approval before any live-store mutation; separate publication approval. Supplier images require reuse rights. |
| Supplier-authorised JSON/feed | Exact source product and variant identifiers, observed catalogue cost and dates | Access/rights depend on supplier agreement. No universal fee or availability claim. | Working provider-independent import; a manual import is not autonomous discovery. |

Customer reviews may expose recurring quality/delivery problems and buying motivations, where permitted to access and retain. V1 records human-reviewed summaries with source links; it does not ingest review text or infer sales from review counts. A general-purpose paid aggregator and Amazon affiliate integration are deferred until licensing and actual eligibility are verified.

## Architecture and current implementation

One Next.js app, one PostgreSQL database, existing deterministic calculator. SourceListing is unique by provider/product/variant. ListingObservation stores price/currency/date history. ImportRun audits successful imports and reserves CJ search cooldowns. Evidence attaches to an Opportunity and optionally a Market. Existing Market/Evaluation/CostInput models remain.

JSON import validates the entire batch before writing, then runs atomically under a PostgreSQL advisory lock. Same observation re-imports are idempotent. Older observations and conflicting values at the same timestamp reject the whole batch. Concurrent promotion creates one opportunity. Later observations preserve history. Each record and price observation distinguishes user import from a direct CJ API response. Promotion never silently copies a catalogue cost into all market currencies or marks it verified.

In the managed runtime Node.js 24 configures fetch from the inherited proxy environment; token injection stays on its supported HTTPS route and TLS verification stays enabled. CJ search is deliberately bounded to one page, has a durable 30-second cooldown and a 20-second request timeout, fails closed on changed response shapes and does not retry quota failures. An authentication rejection permits one official API-key exchange and one catalogue retry; repeated authentication failure stops. No full-catalogue scheduler, automatic matching, automatic competitor research, AI analysis or Shopify publishing is connected yet. Avoid claiming these features are complete.

The current application is a private single-operator app without an authentication layer. Keep development bound to loopback. Authentication/authorization, retention policy and deployment hardening are required before making it a public or multi-user service.

## Next milestones and acceptance

1. **Implemented first slice:** Discovery, authorised JSON import, CJ V2 connector, price history, opportunity promotion, evidence capture, conservative workflow tiers and financial naming/currency fixes. Prove with unit tests, real PostgreSQL integration checks and local HTTP checks. Live CJ authentication and production-form catalogue import were verified on 2026-10-28: 20 real candidates were saved, with 15 single catalogue prices and 5 unknown/range prices. No shipping, demand or profit claims were inferred.
2. **Provider pilot:** CJ_ACCESS_TOKEN is configured and real catalogue discovery is verified. Next verify account terms/credits and compare 5–10 records to exact-variant supplier quotes. Acceptance: traceable candidates, no fabricated shipping/demand and no unexpected account charges.
3. **Two-market economics:** choose trial markets after payment/fulfilment feasibility; exact variant and shipping snapshots are now implemented, with manually sourced FX conversion. Country selection, precise landed-tax treatment and automatic FX remain future work. Acceptance: hand-checked landed-cost examples, currency/date consistency and scenarios retaining unknowns.
4. **Research enrichment:** authorised competitor source plus market-specific trend/creative review. Add match candidates requiring confirmation, evidence supersession and genuine experiment results. Acceptance: recommendations trace to current evidence; source estimates never become observed sales.
5. **Recurring discovery:** a bounded CLI/job with checkpoints, request budget, durable failures, backoff, concurrency locks and alerts. No external scheduling until account access, cost and a manual pilot pass. Acceptance: interrupted runs resume without duplicates or exceeding a configured budget.
6. **Store preparation:** approved details, licensed assets, supplier references and price scenario exported first; optional Shopify draft later. Acceptance: no live-store mutation or publication without explicit approval.

## Cost controls and business validation

No new paid package or provider subscription is required for the implemented slice. Runtime/database/backup costs depend on hosting and were not priced here. CJ account/API charges remain unverified. Use existing infrastructure, limit discovery batches and enrich only shortlisted candidates. AI is optional and must cite evidence; deterministic computations do not need a model call.

Product samples, test shipping and advertising experiments are separate business costs and cannot be eliminated by automation. Choose a personal loss budget before buying anything; stop on unresolved safety/fulfilment concerns or economics that cannot support the required acquisition spend. Track actual gross collected, tax, refunds, variable costs, fixed overhead and cash commitments separately.


## Implemented variant and shipping workflow (2026-10-28)

The operator has not selected commercial markets; only technical test routes were used. No permanent market was created on the operator's behalf.

Discovery candidates received directly from CJ link to `/discovery/[id]`. Refresh obtains exact variant prices via `product/query` and variant-level origin/stock reports via `product/stock/getInventoryByPid`. Missing/range prices stay unknown; CJ-managed and factory quantities are shown separately. Factory availability is not a stock reservation or a delivery guarantee. Removed variants are marked inactive rather than deleting quote history.

Markets now has an optional two-letter destination country independent of its display code. Shipping estimates require that country, one selected variant, a reported positive-inventory origin and a representative postal code. `logistic/freightCalculate` performs an estimate for one unit, not an order. No personal recipient address or store connection is requested. All provider monetary fields remain USD. Product plus shipping is a partial subtotal, not landed cost or contribution.

ShippingQuote stores route/method, one-unit product snapshot, original product-observation time, shipping-observation time, delivery text, provider tax/clearance/total fields and an expiry. Missing extra charges stay null, not zero. The earlier of product and shipping observation plus 24 hours is an application freshness policy, not a provider price guarantee. Quotes missing a legacy product observation cannot be applied. More precise postcode/address-specific quotes and final checkout confirmation may still differ.

Applying a quote is explicit. Product, market, destination and freshness are checked in a transaction. Only supplierPrice and shippingToCustomer are filled as ESTIMATED; duty percentage and fixed handling are reset to UNKNOWN for a fresh review. Selling price, sales tax, fees, return losses and CAC remain as entered. All provider-reported extra taxes/clearance must be reconciled separately to avoid omission or double counting. An incomplete evaluation still shows no after-ad contribution.

For non-USD markets the operator supplies target-currency units per USD, a source URL and a UTC observation date within seven days. Conversion uses exact decimal arithmetic with half-up rounding; there is no automatic or independently verified FX feed. Converted research evidence is labelled ASSUMPTION, while unconverted USD quotes remain PROVIDER_ESTIMATE. Source notes retain quote ID, variant, route, dates and FX provenance. Reapplying identical research does not duplicate evidence.

Changing a market's destination clears applied CJ product/shipping/duty estimates for review and expires their research records. Manually entered costs are preserved. Historical immutable quote snapshots remain visible with their original routes.

Validation: 56 unit tests, type/lint/build checks, database quote/application checks and production HTTP form checks. Real API probes for one product returned 20 GB and 27 US shipping methods; a production form persisted 20 GB estimates in a temporary technical market, then removed that market and its quotes. This validates transport and workflow, not demand, fees, actual delivery or commercial market suitability. No orders, ad spend or Shopify changes were made.

## Research workbench extension

`/research` now provides a market-scoped manual competitor workflow and a transparent investigation shortlist, including products without evaluations. No commercial market was selected. Official research tools open as links; the app does not scrape, call unconfigured third-party APIs, or present those links as collected evidence. Automated demand/competitor feeds, sales estimates, AI analysis, recurring collection and Shopify publication remain outside the implemented workflow.

CompetitorObservation stores merchant, source URL, manually reviewed exact/equivalent/uncertain match, comparison notes, currency, price, shipping, tax basis and observation/expiry dates. Currency must match the chosen market. Duplicate product/market/source/date records are rejected. Missing shipping stays unknown. Summaries use the latest observation per source, exclude uncertain matches, unknown shipping/tax basis and expired records, and group currencies/tax bases separately. A median of displayed offers is not a recommended selling price, realised sales, demand, or a market-wide competitor count. Equivalence and merchant independence still require human judgment.

Evidence can be retired with a reason, preserving its claim and source. Retired support cannot satisfy readiness; retired concerns no longer block it. Retirement does not assert that a risk was solved: the operator must document what changed and record fresh evidence. Original retirement explanations are preserved on repeated submissions. Research records remain self-reported rather than independently certified.

Demand review should record query, country, time window, comparison baseline and limitations; trend direction must remain unknown without sufficient evidence. Reviews reveal possible problems, not unit sales. Ad examples reveal messaging, not CAC, spend, conversions or profitable demand. Competitor prices are deliberately never copied into selling-price inputs automatically.

Verification includes 60 unit tests and a production-form check (`scripts/check-research-http.ts`) covering currency mismatch, unknown shipping, duplicate prevention and evidence retirement. Fixtures are clearly labelled and removed; no business markets or invented competitor data are retained.

## Recurring discovery extension

Automation now supports explicitly enabled keyword schedules; none are created
automatically. A separate worker processes one newest-products page (maximum 20
records) per due schedule. First-page coverage is incomplete and cannot establish
market demand. Five enabled jobs, six-hour minimum interval and a shared limit of
20 scheduled attempts per UTC day bound activity. Failed/interrupted/cancelled
attempts consume budget; cooldown deferrals do not. Manual requests are separate.
Account credits/fees still require confirmation with CJ.

Database leases and fencing prevent parallel duplicates and import-after-pause.
Candidate import, audit and execution completion commit together. Crashes trigger
lease recovery and delayed retry; authentication errors or five consecutive other
failures pause for operator review. Each scheduled import audit is linked by its
execution ID. Only fixed error categories are retained. No arbitrary URL fetch,
store mutation, order placement, ad spend, shipping loop or demand inference is
performed by the worker.

Runbook and validation commands are in README.md. Keep the worker stopped while
running schedule form integration tests, which temporarily enable a fixture.
Validation covers concurrent claims, budget/cap boundaries, idempotent import,
backoff, expired leases, authentication pause and cancellation fencing. Production
live CJ discovery is separately validated; scheduler checks use mocked provider
data rather than repeatedly consuming account quota.

## Official reference FX extension

National Bank of Georgia's [public date-scoped JSON source](https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/?date=2026-10-28)
was verified on 2026-10-28. The default feed returned rates effective 2026-10-29,
while an explicit date=2026-10-28 returned that day's effective rates. This is why
the application scopes requests to the Georgian calendar date and rejects future
effective dates. The [ECB daily reference feed](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml)
was also reachable, but is not used in this implementation; NBG covers the six
supported currencies including GEL without a second integration.

Reference-rate retrieval is on demand from Markets, with a ten-minute cooldown
and fixed official HTTPS destination. No new credential is needed for the tested
public request. FxSnapshot preserves provider/currency/rate/effective date/source;
identical values deduplicate, corrections with different values can coexist for
historical review. Non-USD quote applications explicitly choose a snapshot or a
manual rate. Values remain estimates/assumptions because bank spread, conversion
fees and actual settlement timing are not represented by a reference price.

Cross rates use GEL-per-quantity source amounts and exact rational arithmetic,
rounded to eight decimal places; conversion to monetary minor units remains
half-up. Missing currencies, duplicate source currencies, mismatched effective
dates and nonpositive values fail closed. A seven-day calendar freshness window
allows weekends without silently accepting indefinitely stale data. No previous
cost input is silently revalued, no country is selected and no scheduled FX
network requests run by default.

Validation: 68 unit tests, lint/type/build checks, real NBG retrieval through the
production Markets form, cooldown enforcement, official snapshot application,
wrong-currency rejection, manual fallback and dated source provenance. Temporary
technical markets/products are removed. This validates reference calculations,
not actual payment-provider settlement rates or commercial profitability.

## Optional eBay Browse offer-review extension (2026-10-29)

The official [OpenAPI specification](https://developer.ebay.com/api-docs/master/buy/browse/openapi/3/buy_browse_v1_oas3.json)
was read to verify `/item_summary/search`, marketplace header, limit/filter
parameters, summary fields and base OAuth scope. The [production requirements](https://developer.ebay.com/api-docs/buy/static/buy-requirements.html)
and [client credentials documentation](https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html)
were reachable. The production requirements describe application review/contracts
for relevant Buy API use cases; exact eligibility and approved use must be checked
with eBay for this app, not inferred from the existence of documentation.

Implemented: bounded on-demand fixed-price search on `api.ebay.com`, explicit
country/currency mapping, one-minute cooldown, safe response parsing and an
ExternalOffer review inbox. No scraping, image copying, eBay background collection,
automatic product-equivalence claim or demand inference is performed. A valid
production application bearer token is an external prerequisite; the current
instance has no EBAY_ACCESS_TOKEN. Real provider authorization, current quota,
fees and retention/display conditions are unverified. Automatic token issuance
and renewal are not implemented; expired tokens fail clearly.

Candidates remain outside comparable-price summaries until explicit comparison
review. Confirm pack, model, condition, delivery and source context. Shipping and
tax basis stay unknown unless the operator supplies them; they are never silently
zeroed. Refreshing an offer expires its old accepted observation and returns it
to pending, preserving historical prices. Changing market destination invalidates
old comparisons. Only price observations are created; no demand evidence or
selling-price assumptions are filled. An equivalent-looking item can still be a
poor match: the human review is a judgment, not independent certification.

Validation: 73 unit tests, database pipeline tests and production HTTP review/
destination-change tests with temporary fixtures and mocked provider responses.
No real eBay data or commercial market was created. Live provider readiness is
not claimed. Manual source-based competitor research continues without eBay.
