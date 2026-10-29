# Saved-source AI research (first integration)

This version explains saved product data with cited source IDs. It does not browse,
claim live demand, overwrite economics, promote evidence, order or publish.
OpenAI Responses API requests go only to `https://api.openai.com/v1/responses`.
`store:false` is requested; this is not a promise of zero provider retention.
Official API reference: https://platform.openai.com/docs/api-reference/responses/create

## Laptop setup

Run in the existing Windows CMD checkout, after stopping the app with Ctrl+C:

```bat
cd C:\Users\temof\arbitrage-finder-local
git pull --ff-only origin feature/product-research-automation
npx prisma generate
npx prisma migrate deploy
```

The preview and disabled UI work without an API account. For live use, create an
API key in your own OpenAI API platform account, check model access and pricing,
and configure project budgets/alerts separately. ChatGPT subscription does not
supply API credit. No paid call was needed to implement or test this feature.

Edit `.env.local` locally (never share it) and add the following variables using
your actual key and an accessible Responses/structured-output-compatible model:

```dotenv
OPENAI_API_KEY=replace_locally_with_your_key
OPENAI_RESEARCH_MODEL=gpt-4.1-mini
OPENAI_RESEARCH_ENABLED=true
```

`gpt-4.1-mini` is a suggested starting model, not a guarantee of access or cost.
Restart `npm.cmd run dev -- --hostname 127.0.0.1`. Open a real product → AI research,
inspect the complete outgoing packet, then confirm the explicit send checkbox.
Do not add `NEXT_PUBLIC_` to any of these names. To disable paid calls, remove
`OPENAI_RESEARCH_ENABLED` or set it to `false`, then restart.
Cloud setup would need a separately configured secret and api.openai.com network
access. This change does not modify or publish the cloud environment settings.

## Bounds and interpretation

One request per explicit action; no automatic retries, tool calls or browsing.
Hardcoded 60-second timeout, 2400 output-token cap and 100 KB input packet cap.
Maximum 10 attempts per UTC day across this single-owner database, with 90 seconds
between all attempts, atomically enforced by an advisory transaction lock. Failures
and interrupted requests count. These are request limits, not a currency budget.
The budget counter survives product deletion. Use provider-level budgets for
an independent spending control. A crash can leave PENDING permanently; it means
an unknown result, not permission to repeat without reviewing usage.

Reports retain their exact bounded source snapshot and input hash. Changes or a
new UTC date mark old reports as different. General product notes and account
secrets are excluded, but evidence, cost notes and public provider/source data are
included: review them before sending. Preview size limits exclude older records
explicitly. Failed requests retain input snapshots but no provider error body.

Output is schema-checked and every citation must reference an included source ID.
This rejects fabricated IDs; it cannot establish that a claim follows from its
citation. Source text is treated as untrusted data; the model gets no tools or
write permissions. Always review AI drafts against the saved evidence. Financial
calculations are supplied by the existing deterministic calculator. No generated
figure is written into calculations or VERIFIED evidence.

Reports are part of the private database and its backups, not Git. Deleting a
product removes its reports. Tests use mocked API responses and disposable DB
fixtures; a successful paid end-to-end provider call remains to be checked after
the owner configures access and explicitly runs it.
