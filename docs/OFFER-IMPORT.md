# Batch source offers into human review

Research → select product and market → External offers awaiting comparison →
"შეთავაზებების ერთიანი JSON შემოტანა". Paste an authorized source's data in the
shown format, preview, then explicitly confirm data-use permission and save.
Editing the JSON removes the old preview/confirmation. No API credential needed.
This imports supplied data; it does not automatically search or scrape websites.

The envelope requires destinationCountry, currency and offers. Every offer needs
its real source URL, title, merchant, integer minor-unit price and ISO UTC
observedAt/expiresAt. Never use invented dates/prices or import the illustrative
example as research. The complete research-export JSON is a different format.
Limits: 50 rows, 200 KB, no duplicate source URLs, no future observations, expiry
still current and no more than 24 hours after observation. Unsupported fields
including accepted/match statuses are rejected. Shipping and taxes are deliberately
not imported: confirm them independently during comparison review.

The selected market's version/country/currency are checked under the existing
market/review locks. All rows save atomically or none do. Imported offers use
manual-json provider identity and a stable source-URL hash. Identical re-imports
preserve reviewed/rejected status. Same source timestamp with changed fields and
older observations are rejected. Newer data resets the offer to PENDING and
expires its old accepted observation so stale prices do not continue to support
comparison scenarios. Source timestamps are preserved, not replaced by import time.

The existing explicit ACCEPT/REJECT form handles manual-json and eBay offers.
Accepting is a user comparison decision, not verified demand or sales. The inbox
pages through 40 offers at a time; all imported records remain reachable. Updated
offers retain their original ID; pagination orders by ID, not update time.
No costs/evidence are filled automatically. No new tables, migration, dependency,
paid service, background collection or AI call was added. Pending offers remain
outside the product research export until reviewed as competitor observations.

Tests cover malformed/expired/oversized input, duplicates, idempotency, market
version changes, acceptance, invalidating old observations, full rollback on a
conflicting row, owner-only UI, real browser preview/consent and inbox pagination.
