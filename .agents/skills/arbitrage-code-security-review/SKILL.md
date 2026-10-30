---
name: arbitrage-code-security-review
description: Review substantive diffs, owner-authenticated endpoints, imports, exports and external API changes for requirement fit and concrete security/data-integrity risks.
---

# Review the actual change

Read AGENTS.md first. Adapted from Matt Pocock code-review and ECC security-review;
source revisions/licenses are in docs/skill-sources/. This adaptation performs the
review in the current agent and does not require trackers, installers or hooks.

Choose an existing meaningful baseline from the task/branch; record the revision
and changed files. If scope cannot be inferred, ask only for the missing scope.
Review requirements and security separately; correctness on one does not prove
the other. Review only relevant code, not a speculative redesign of the app.

Requirement fit:
- Preserve the single-owner personal research goal, existing calculations and
  supported channels. Do not invent a selling channel, merchant approval or price.
- Distinguish provider estimate, user observation, assumption, unknown and expired
  evidence. Unknown taxes/shipping must not become confirmed zero.
- Check market/currency/variant/pack identity, source dates and partial failure.
- Verify that the requested behavior is implemented and unrelated scope is absent.

Security and integrity:
- Owner authorization on each server action/route; mutation origin validation.
  A protected layout or hidden form field alone is not authorization.
- Server-side schemas, byte/row/token/time caps and bounded pagination. Reject
  partial/invalid imports atomically; test duplicate and stale-version paths.
- No API keys, sessions, passwords or .env in browser props, URLs, logs, exports or
  commits. Owner-entered notes may contain sensitive text: sharing needs review.
- Parameterized Prisma queries, correct lock order, transactional writes and
  optimistic version guards. Never touch other_project or reset databases.
- Fixed allowed provider endpoints, TLS/proxy preservation, explicit execution,
  cooldowns and no silent paid fallback/retry. Imported/AI text is untrusted data.
- Exports are owner-only/private/no-store, safe attachments; no raw HTML execution.
- Test consequential failure paths and unchanged financial inputs where promised.

Report concrete findings with file/line, trigger, consequence and smallest fix.
Separate confirmed issues from uncertainty. If no issue is found, say which scope
was reviewed and what was not validated; do not claim independent certification.
No automatic publishing, messaging, subscriptions or migration execution.
