# AI provider switching: Gemini and OpenAI

Both providers use the same research page, report validation, private snapshots,
shared daily attempt counter and 90-second cooldown. No migration is required
for provider switching. Reports now record `provider:model` in the existing model
field; older unprefixed model records were OpenAI. There is no automatic failover,
so errors never trigger an unexpected paid request to another service.

## Gemini configuration on Windows

Stop the app with Ctrl+C and open the existing local configuration:

```bat
notepad C:\Users\temof\arbitrage-finder-local\.env.local
```

Preserve existing database/CJ/auth settings. Add or update each variable once:

```dotenv
AI_PROVIDER=gemini
AI_RESEARCH_ENABLED=true
AI_RESEARCH_MODEL=YOUR_AVAILABLE_GEMINI_MODEL_ID
GEMINI_API_KEY=YOUR_PRIVATE_KEY
```

Replace the two placeholders locally: use the exact compatible model ID shown in
Google AI Studio and your API key. Use a model supporting generateContent and JSON
schema structured output. Model availability/free-tier eligibility varies: inspect
your project's quota, billing status, and current data-use terms before sending
research notes. Do not enable paid billing merely to configure this feature.
Key creation: https://aistudio.google.com/apikey
API reference: https://ai.google.dev/api/generate-content
Data terms: https://ai.google.dev/gemini-api/terms
Pricing/free-tier details: https://ai.google.dev/gemini-api/docs/pricing

Restart the app. Product → AI research shows `gemini` and the exact model before
you consent to sending. Review the outgoing data packet first. If Gemini is missing
its key or returns an error, OpenAI is never called as a fallback.

## Switch to OpenAI later, without changing code

Keep your Gemini key privately if desired; set these variables instead:

```dotenv
AI_PROVIDER=openai
AI_RESEARCH_ENABLED=true
AI_RESEARCH_MODEL=gpt-4.1-mini
OPENAI_API_KEY=YOUR_PRIVATE_OPENAI_KEY
```

Use a Responses/structured-output-compatible model available in your own account;
the example is not an access or cost guarantee. Restart the app. Both keys may be
present, but only the selected provider is used. To disable all calls, set
`AI_RESEARCH_ENABLED=false` and restart. Never use NEXT_PUBLIC_ for secrets.

Older OpenAI-only settings remain compatible when AI_PROVIDER is absent.
When AI_PROVIDER is explicitly set, use AI_RESEARCH_ENABLED. AI_RESEARCH_MODEL
selects the model for either provider; provider-specific OPENAI_RESEARCH_MODEL or
GEMINI_RESEARCH_MODEL are fallbacks only when the shared model setting is absent.
Unknown providers or incomplete configuration disable research. A new provider
with a different API still needs an adapter; these settings support the two
implemented providers, not every arbitrary external API.

Gemini uses a fixed Google endpoint and x-goog-api-key header, never a key in the
URL. OpenAI uses its fixed Responses endpoint. Neither adapter browses, uses tools,
follows redirects, or retries automatically. No dependencies or database fields
were added. Real paid/free-quota provider calls were not made in implementation
checks; the first live call requires your configured account and explicit action.

---

# Shared research behavior

This version explains saved product data with cited source IDs. It does not browse,
claim live demand, overwrite economics, promote evidence, order or publish.
OpenAI Responses API requests go only to `https://api.openai.com/v1/responses`.
`store:false` is requested; this is not a promise of zero provider retention.
Official API reference: https://platform.openai.com/docs/api-reference/responses/create

## Updating an existing checkout

Stop the app, then run `git pull --ff-only origin feature/product-research-automation`.
Provider support adds no migration or dependency. If upgrading from before the
first AI feature, see that release's report-table migration instructions; obtain
owner approval before applying any unapplied migration. Restart the application
after editing environment settings. Cloud credentials/network access must be
configured separately for the selected fixed host; nothing here publishes cloud
settings.

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
