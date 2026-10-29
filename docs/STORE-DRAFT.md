# Offline store draft preparation

Open an Opportunity and choose **Prepare a store draft**. Enter the product title,
plain-text description, one to ten source URLs supporting its factual claims,
and confirm you reviewed those claims. Download the JSON preparation file.
Typed text is not saved in the app; retain the file if needed. No new token,
dependency or database migration is required.

The file contains reviewed title/escaped HTML description with fixed DRAFT status,
research identifiers/source URLs, limitations and an outstanding commercial review
checklist. Private research notes are not copied to customer text. Prices,
currencies, markets, variants, images and inventory are not inferred. There is no
AI-generated benefit, certification, delivery promise or sales claim. Operator
confirmation is not independent verification. No image reuse licence is asserted.

This is a local JSON handoff, **not** Shopify Admin CSV, an automatically importable
product file, or a complete GraphQL request. The candidate product input fields
were checked against Shopify's official ProductCreateInput documentation:
https://shopify.dev/docs/api/admin-graphql/latest/input-objects/ProductCreateInput
No live Shopify account, API request, mutation or publication was tested or used.
A future integration requires account permissions and explicit approval. DRAFT
status is fixed in this file; external tools and later edits need separate review.

Both page and download require owner sign-in. The POST additionally checks the
configured origin, caps the streamed body at 32 KB, validates source URLs without
fetching them, rejects stale product metadata, escapes HTML and returns a private,
no-store attachment. Downloading does not update research or financial inputs.
Review files may contain private sourcing URLs; inspect them before sharing.
Claims, supplier variant, market, pricing, fulfilment, taxes, safety, returns and
asset rights must still be reviewed before selling. An exported draft is not an
assertion that any of those checks have passed.

Update the local checkout with `git pull --ff-only origin codex/product-research-automation`,
then restart the app. If earlier updates are not yet installed, follow the
full generate/migrate startup commands in LOCAL-SETUP.md.

Validation: 92 unit tests, lint/types and production build. Tests cover review and
source requirements, HTML escaping, Windows line endings, no private-note copying,
and fixed DRAFT/no-price/no-image output. `scripts/check-store-draft-http.ts`
checks protected page/POST, origin rejection, invalid claims/source input, stale
metadata, response headers, body limits and unchanged research using a temporary
fixture that is removed. It never contacts Shopify.
