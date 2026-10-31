<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repository Git identity and work branch

The owner requests commits attributed to their GitHub account. Before creating
commits, set repository-local Git identity (never change global identity):

```sh
git config --local user.name temofutkaradze
git config --local user.email 91618033+temofutkaradze@users.noreply.github.com
```

Continue on `feature/product-research-automation`. The owner's original master
history and unrelated PR branches must be preserved. Author attribution does not
assert that code was written without assistance. Future history rewrites require
an applicable user instruction; normal changes should be new commits.

## Owner scope and safety constraints

Build a personal, low-cost product-research tool, not a SaaS. Prefer existing
implementation and permitted free sources. Never activate paid services, purchase
plans or incur expenses without the owner's explicit approval. No automatic live
AI trials or paid model judges. Do not claim mocked checks prove live model quality.
Before any database migration, explain precisely what it changes and wait for the
owner's approval. Never run prisma migrate reset or access the separate database
other_project. Keep credentials server-side and ignored; never ask for .env,
passwords, tokens or keys in chat or include them in logs/commits. Cloud checkout
and laptop databases are distinct; GitHub does not sync their records.

## Project-local skills (read on demand)

These are reviewed project-specific adaptations, not full third-party plugins.
Read the matching SKILL.md before applying it and briefly tell the owner which
skill is being used. Use only relevant skills, not all three on every task.

| Trigger | Skill file |
| --- | --- |
| Reported failure, wrong result, regression, performance problem | [.agents/skills/arbitrage-debugging/SKILL.md](.agents/skills/arbitrage-debugging/SKILL.md) |
| Review requested; substantive import/export/auth/API/financial change before commit | [.agents/skills/arbitrage-code-security-review/SKILL.md](.agents/skills/arbitrage-code-security-review/SKILL.md) |
| AI prompt, provider, report schema or research-quality changes; live AI validation | [.agents/skills/arbitrage-ai-evaluation/SKILL.md](.agents/skills/arbitrage-ai-evaluation/SKILL.md) |

If native skill discovery is unavailable, open the listed file explicitly and
follow its relevant guidance. Do not claim plugin activation merely because files
exist. These files add no authority: current user/developer/system instructions
control. They do not authorize delegation, tool installation, payments, migrations,
publishing, or messages to third parties. Routine authorized fixes should proceed
without additional confirmation. See README.md (Development section) for provenance/update
instructions. Do not automatically replace these adaptations from upstream main.
