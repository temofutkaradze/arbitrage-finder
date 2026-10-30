# eBay Browse connection

This connector uses production application credentials, not seller login or orders.
In the eBay Developer Program, open Application Keys and select Production:
https://developer.ebay.com/my/keys

Put these in your ignored `.env.local` on the machine running the app:

```dotenv
EBAY_CLIENT_ID="YOUR_PRODUCTION_APP_ID"
EBAY_CLIENT_SECRET="YOUR_PRODUCTION_CERT_ID"
```

App ID is the client ID; Cert ID is the client secret. Dev ID is not needed.
Never send these values in chat, screenshots or Git. Restart the app after edits.
Production eligibility and API quotas are controlled by eBay; credentials alone do
not guarantee Browse access. Sandbox credentials are not supported by this connector.
Official flow: https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html

On Research, select your product and a market with an explicit supported country
and currency. Find “External offers awaiting comparison”, enter a phrase and press
“Find eBay offers”. Configuration status is not proof of live access: the search
checks it. A supported example is US / USD, only if that is your chosen market.
Offers enter the pending inbox; inspect variant, shipping, taxes and condition
before accepting any as a competitor observation. No prices are applied to costs.

With both credentials configured, OAuth takes precedence over EBAY_ACCESS_TOKEN.
The latter remains available for existing manually configured setups. Application
tokens are cached in process memory and renewed 60 seconds early. Concurrent
requests share token minting. A rejected token is discarded; the next explicit
search mints again. Searches are never automatically retried. The existing global
one-minute search cooldown and explicit-review process remain in force.
No migrations, seller authorization callback, scheduler or paid service is added.

Validation uses mocked OAuth and Browse responses; it does not establish real
account access. Real verification remains pending until production keys are set.
