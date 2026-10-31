> Historical owner-supplied context from the old laptop folder. This is an archived document, not current runtime instructions or verified machine state. See docs/PROJECT-STATUS.md for the current implementation.

# AI Product Arbitrage Finder — Project Context

> **Purpose of this document:** Transfer the current project context into a ChatGPT Project and use it as a reliable handoff brief for ChatGPT and Codex. Treat the repository and current machine state as the source of truth for code. This document records the last known state and may need to be reconciled with the actual repository before any changes are made.

## 1. Project goal and scope

I am building a **private tool for my own use** to discover potential product-arbitrage opportunities. It is not a SaaS product, and I am not currently trying to sell subscriptions, acquire customers, or build for other businesses.

The tool should help me:

- Discover products that may be cheaper in one market or from one supplier than in another market.
- Compare purchase/supplier prices with realistic potential resale prices.
- Estimate the *actual* profit after shipping, customs/import costs, marketplace fees, payment fees, taxes, packaging, returns, and other relevant expenses when those costs can be estimated.
- Compare opportunities consistently and avoid misleading calculations based only on the purchase price and resale price.
- Keep track of promising products and the assumptions behind each calculation.

The long-term aim is a useful, practical personal research tool—not an overcomplicated dashboard or an AI demo. Accuracy, traceable assumptions, and low operating cost matter more than flashy features.

## 2. Non-negotiable constraints

1. **Personal use only for now.** Do not turn the project into a SaaS, add subscription or customer-management features, or propose a customer-acquisition plan unless I explicitly change the scope.
2. **Free-first.** Prefer free, open-source, local, and low-maintenance solutions. Avoid introducing paid APIs, subscriptions, hosting, databases, proxies, or other services that create extra costs.
3. **Verify before recommending integrations.** If an external API, data provider, marketplace, scraping method, or service is proposed, verify its current official documentation, pricing, rate limits, and access conditions first. Clearly state any restrictions. Do not activate a paid service or incur a cost on my behalf.
4. **Do not assume an API has a usable free tier.** A service being popular or having a developer page does not mean it is free or permits the intended use.
5. **No secrets.** Never ask me to paste `.env` contents, passwords, API keys, access tokens, database connection strings, or other credentials into chat. Do not print, expose, commit, or log secrets. Work with variable names and redacted diagnostics instead.
6. **Protect existing data.** Never run `prisma migrate reset`, drop a database, wipe tables, or perform destructive database operations without a specific, explicit request and a verified backup/rollback plan.
7. **Do not touch the unrelated database.** The PostgreSQL database named `other_project` belongs to another project. Do not inspect or modify it. The database intended for this project is named `arbitrage`.
8. **Inspect before changing.** First examine the actual repository, package scripts, schema, migrations, tests, and Git state. Do not presume this context file is more current than the code.
9. **Small, explainable steps.** Prefer the smallest useful improvement. Explain what will change and why, and verify changes with suitable tests or checks.
10. **No unnecessary AI features.** Do not add AI scoring, paid LLM APIs, or complicated autonomous agents unless a concrete need is established and the costs and alternatives have been reviewed.

## 3. Local development environment and project location

- Operating system: Windows.
- Local project directory: `C:\arbitrage-finder`.
- Framework: Next.js.
- UI: React and TypeScript.
- Database: PostgreSQL 16.
- ORM: Prisma 7.10.1.
- Tests: Vitest.
- Intended project database: `arbitrage`.
- Application database role: `arbitrage_app`.
- PostgreSQL superuser account exists, but credentials must remain private and must not be requested in chat.
- A separate database named `other_project` exists and must not be touched.

The user previously reported that there is **no `.env` file**. Confirm the present state locally; do not create or populate secrets without an explicit, justified need. The project has used `.gitignore`, and local secret/config files must remain untracked.

## 4. Previously reported implementation

The following features/files were reported as already implemented. Verify each against the current repository before relying on it:

- Overview page.
- Markets page.
- Opportunities list and opportunity-detail pages.
- Form for creating a new opportunity.
- Profit calculator with calculations/outputs for:
  - Net profit.
  - Profit margin.
  - ROI.
  - Maximum CAC (customer acquisition cost), if applicable to the modeled transaction.
  - Break-even ROAS and/or break-even selling price.
  - Scenario comparisons.
  - Fees and taxes.
- Prisma schema and an initial migration.
- Seed/sample data.
- Database safety guard and tests.
- Profit-calculation logic and tests.
- `PHASE3.md` project notes.

The user previously reported that **21 tests passed**, but that result has not been re-verified in this handoff. Run the current test suite before reporting the current status.

## 5. Database and migration notes

- The initial migration reportedly succeeded after granting `USAGE` and `CREATE` on the `public` schema to `arbitrage_app`.
- Never use `prisma migrate reset`.
- Do not modify, drop, or connect to `other_project` for project work.
- Before any migration, inspect the current migration history, schema, database target, and working tree.
- Prefer additive migrations and non-destructive changes.
- Do not claim the database is safe or up to date without checking the actual local environment and migration status.
- Do not print database credentials or full connection URLs in logs or chat.

## 6. Git and GitHub status

Last reported Git state:

- A local commit was created: `64a85b3`.
- Commit message: `Initial commit: arbitrage finder`.
- It reportedly included 33 files changed, with 5,172 insertions and 869 deletions.
- At the last check, `git remote -v` returned no remotes. Therefore, the repository had not yet been connected to a GitHub remote at that time.
- A private GitHub repository named `arbitrage-finder` was planned, with no README, `.gitignore`, or license pre-created on GitHub.

**Do not assume the push has or has not happened since that check.** Verify with `git status`, `git log -1 --oneline`, and `git remote -v` before proceeding.

If the GitHub repository has been created and there is still no `origin`, connect the correct repository URL and push the existing branch. Do not overwrite an existing remote, change branches, force-push, or publish the repository publicly without the user's explicit approval. The local branch was referred to as `master` in earlier instructions, but confirm the actual branch rather than assuming its name.

Keep `.env`, credentials, local database data, and other secrets out of Git. The `.agents`, `.claude`, and `.windsurf` folders were intentionally excluded from tracking; do not add them automatically.

## 7. Product and calculation principles

The central value of the tool is **realistic, auditable profit estimation**, not merely finding a lower price.

When implementing or reviewing the calculator:

- Make clear which values are user inputs, observed data, estimates, or assumptions.
- Show the components of costs instead of hiding everything in one unexplained fee percentage.
- Do not treat an asking/listing price as proof that a product actually sells at that price. Where possible, distinguish active listings from completed sales or other evidence of realized selling prices.
- Show the date, source, currency, and unit/bundle quantity where available.
- Handle currency conversion transparently and account for uncertainty in the exchange rate when relevant.
- Avoid double-counting shipping, tax, customs, marketplace fees, or other expenses.
- Make unclear or missing expenses visible. Do not silently treat unknown costs as zero.
- Support conservative, base, and optimistic scenarios when the data is uncertain, and label them as scenarios rather than facts.
- Display the formula or breakdown for important outputs so I can understand and challenge the result.
- Consider refunds/returns, damaged stock, unsold inventory, and price changes when relevant to the transaction model.
- Distinguish gross profit, net profit, margin, and ROI; do not use these terms interchangeably.
- If maximum CAC or ROAS is not meaningful for a particular resale workflow, explain that instead of presenting a misleading figure.

Do not assume a particular marketplace, country, product category, supplier, or shipping route unless the current UI/code or the user specifies it. Ask only for information that is truly necessary to make progress; otherwise, make assumptions explicit and keep moving.

## 8. UI and engineering preferences

- Prioritize clarity, usability, and reliable behavior over visual effects.
- Keep the interface clean and restrained, with an information hierarchy that makes prices, costs, sources, assumptions, and profitability easy to compare.
- Avoid generic, over-decorated, obviously AI-generated-looking UI.
- Avoid adding features just to make the project look more sophisticated.
- Keep the code maintainable and typed; reuse existing project conventions rather than introducing another framework or library without a reason.
- Do not replace working sections or perform broad refactors when a small change will solve the problem.
- Preserve existing user data and current behavior unless a change is required and agreed upon.

## 9. Recommended workflow for ChatGPT and Codex

When starting work in a new account or on a new machine:

1. Read this document and `PHASE3.md`.
2. Inspect the current repository and establish the real state before editing. At minimum, review:
   - `git status --short` and the current branch/recent commit.
   - `git remote -v` (do not reveal credentials if embedded in a URL).
   - `package.json` and available scripts.
   - `prisma/schema.prisma` and existing migration files.
   - Database safety guard and profit-calculation implementation/tests.
   - Existing README/project notes, if present.
3. Identify what is complete, what is incomplete, what is failing, and what remains uncertain. Separate verified facts from assumptions and historical notes.
4. Run safe local checks/tests that do not alter or reset the database. Report the actual command and result.
5. Recommend the **single most useful next step** that fits personal use, the free-first constraint, and the current stage of the codebase.
6. Before modifying code, state the intended files and a short plan. For meaningful or risky changes, wait for approval. Never perform destructive database actions or paid-service setup without explicit permission.
7. Implement incrementally and run targeted tests plus the relevant full checks when practical.
8. Summarize changed files, why the changes were needed, commands/tests run, results, and any remaining limitations.

### First task for a new Codex session

**Inspection only; do not edit files or run migrations yet.**

- Confirm that the working directory is the correct `arbitrage-finder` repository.
- Read this document and `PHASE3.md` if available.
- Inspect the current Git state, package scripts, Prisma schema and migration history, database safety guard, profit-calculation code, and tests.
- Run only non-destructive checks that are safe in the current environment; do not expose secrets.
- Report:
  1. What is verified to exist and work.
  2. What is incomplete or broken.
  3. Whether the GitHub remote is configured and whether the working tree is clean (without leaking credentials).
  4. What checks/tests were run and their actual result.
  5. The smallest useful next step, with any external API or data-source pricing/access verified from official documentation before recommending it.
- Do not make changes until the inspection report is complete.

## 10. ChatGPT Project instructions to add

Use the following as the Project's custom instructions, or adapt them without weakening the safety constraints:

> You are helping me build AI Product Arbitrage Finder, a personal-use product-arbitrage research and profit-calculation tool. This is not a SaaS and is not intended for customers. Keep everything free-first and avoid new recurring costs. Verify official pricing, limits, and terms before recommending an external API or data source. Never ask me to share `.env` files, credentials, API keys, tokens, or passwords. Do not run `prisma migrate reset`, drop data, or perform destructive database actions. Never touch the PostgreSQL database `other_project`; this project uses `arbitrage`. Inspect the actual repository before assuming what exists. Prefer small, maintainable changes and verify them with tests. Explain costs and assumptions transparently, and do not silently treat unknown expenses as zero. For the first task, inspect the repository and report its real state without modifying files or running migrations.

## 11. Important distinction: Project context versus code access

Uploading this document to a ChatGPT Project preserves the written context, but **does not automatically give Codex access to `C:\arbitrage-finder`**. Codex needs to be opened/configured with the correct local folder or an accessible Git repository. A GitHub backup also does not mean that Codex has the local PostgreSQL database or local environment configured. Verify which machine, repository, branch, and environment Codex is actually using before making changes.

## 12. Current status and open questions

This handoff does not establish the current state of the machine. The following must be checked rather than assumed:

- Whether `C:\arbitrage-finder` still matches the recorded code state.
- Whether the local tests still pass.
- Whether `PHASE3.md` describes additional pending tasks.
- Whether a private GitHub repository has now been created and connected.
- Whether the app currently has any configured data sources, and what their present access/pricing terms are.
- Whether any local database migrations are pending.

Start by verifying those facts. Do not guess, silently fill gaps, or present old status as current fact.
