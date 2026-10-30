# Share a saved product research snapshot

On the laptop, sign in → My products → open the actual product →
**ჩამოტვირთე კვლევის სრული პაკეტი (.json)**. The existing .txt download also
includes saved supplier variants, stock and shipping quote snapshots now.

Review the file in a text editor before attaching it to a chat or sending it to
someone. General product notes, cost/evidence notes, source URLs and research
postal codes are included and can contain private business information. No .env,
API key configuration, password/session table or other products are queried.
User-entered secrets in notes cannot be automatically recognized or redacted.
Never send the database backup or .env instead of this snapshot.

JSON uses `schema: arbitrage-finder.research`, `version: 2` and contains:

- Product fields and all saved market evaluations, original inputs and notes,
  deterministic calculations, readiness and read-only competitor price scenarios.
- Linked catalogue entries and operator-entered identifiers.
- Saved active/inactive supplier variants, their observed stock JSON and dates.
- Saved shipping quotes, exact variant/market IDs, route/ZIP/method, product and
  shipping prices, unknown versus zero taxes, product/quote dates and expiry.
- Evidence including retired/expired records, and competitor observations.

Dates serialize as ISO UTC. Local IDs refer to objects inside this snapshot; they
are not universal product identities. Link the external product/variant IDs and
SKU to identify a CJ product. JSON quote reviewState is evaluated at export time;
review does not mean verified, reserved, applicable or guaranteed.

No CJ, retailer or AI request occurs. Downloading does not write to the database,
change a financial input, select a market or apply a quote. Reports are generated
from a repeatable-read transaction and are private/no-store owner-only attachments.
The JSON is a research exchange artifact, not an automatic importer, sync feature
or database backup. Opening it does not populate another installation's database.
AI reports, external offer inbox, financial/matching audit trails and catalogue
price-observation history are intentionally outside this research snapshot.

Bounds: 100 evaluations, 2000 evidence records, 500 linked listings, 2000 competitor
observations, 500 saved variants, 2000 shipping quotes and 5 MB final document.
Exceeding a bound rejects the download (413); it never silently exports a partial
research package. A snapshot does not infer missing information or fetch fresh
prices. Full backup/restore is a separate feature.
