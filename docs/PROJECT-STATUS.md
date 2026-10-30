> Post-release addition (2026-10-31): [browser-run CJ batch for 1–3 saved candidates](automation/RESEARCH-BATCH.md). eBay/AI orchestration is not included in this first batch stage.

# First local version — acceptance status

Scope: a single-owner product-research and contribution-analysis workspace on the
owner's laptop. This is the first local version (package version 0.1.0); it does
not claim a fully autonomous product-discovery business or public launch readiness.
For operation and the final acceptance record see [LOCAL-RELEASE.md](LOCAL-RELEASE.md).

## Implemented

- CJ search/import → saved product → exact variant and stock reports → destination
  shipping estimate → explicit application as estimated costs.
- Sourced identifiers, reviewed linking/undo, manual competitors and evidence,
  bounded pending-offer JSON import, expiry and correction history.
- Deterministic product/market calculations, unknown essential inputs blocking
  results, separate currencies, competitor-price scenarios and advertising scenarios.
- Financial history and optimistic conflict protection; private JSON/TXT report
  downloads and offline store-draft export, without store publication.
- Gemini and OpenAI adapters; explicit provider/model configuration, outgoing
  packet preview and consent, local configuration diagnosis, source-ID validation,
  safe failure categories, bounded 120-second deadline and no automatic retries.
- Calm responsive interface, grouped navigation, self-hosted Georgian font,
  optional dark theme, owner sign-in, local PostgreSQL backup helper.
- Optional paused-first scheduled CJ discovery and production eBay OAuth/Browse
  integration. Neither is enabled automatically.

## Live observations versus test evidence

The owner reported one successful Gemini research run on the laptop, and supplied
the output for source comparison. Its quoted prices and incomplete inputs matched
the supplied snapshot. This is evidence for that run, not a model reliability score.
The assistant also read the exact CJ variant using the existing secure API binding.
Neither observation guarantees future provider uptime or current delivery prices.
Final automatic acceptance checks use temporary fixtures and mocked providers;
see the release record for actual results. No new live AI trial is part of release.

## Open external and commercial matters

- eBay production account approval and real credentials: pending; manual research
  remains available. Mocked OAuth success does not prove account eligibility.
- The Kitchen Organizer manufacturer/GTIN and equivalence to Walmart: unconfirmed.
  Keep the competitor UNCERTAIN; do not infer demand or a complete profit figure.
- Merchant approval, selling channel, registration, taxes, returns and real CAC:
  not established. Contribution excludes fixed overhead and business income tax.
- Public deployment/store connection, orders, ads and bank communication: outside
  this local release. No automatic end-to-end competitor/demand web research is
  implemented; AI analyzes saved sources and does not browse.
- Cloud environment Publish failure is separate from repository delivery. GitHub
  syncs code, not the owner's database or ignored environment files.

These are explicit limits of this release, not an indefinitely expanding checklist
required to finish its technical acceptance. New capabilities need a new scope.
