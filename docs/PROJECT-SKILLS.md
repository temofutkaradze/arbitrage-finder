# Project-local development skills

Three small, reviewed adaptations live in `.agents/skills/` and travel with this
repository. They guide the coding assistant; they do not add intelligence to the
running website, provide market data or configure Gemini/OpenAI credentials.
No plugin marketplace, global settings, auto-update, scripts, hooks or MCP servers
were installed. Existing skills elsewhere in the environment are unchanged.

- arbitrage-debugging: reproducible diagnosis and focused regression checks.
- arbitrage-code-security-review: requirement fit and security/data integrity.
- arbitrage-ai-evaluation: deterministic checks versus live/semantic AI evaluation.

AGENTS.md routes future work to these files. Codex clients supporting repository
skill discovery can discover the SKILL.md files; clients without that facility
must read the explicitly linked instructions. A running client may need a new
session to refresh its skill menu. No claim of dynamic plugin activation is made.
The assistant can read the local files directly in this session.

After `git pull`, the laptop checkout receives these tracked files. No npm install,
server restart, migration, API key or subscription is needed for the skills.
The site behavior is unchanged. You may request a skill explicitly by its name.

## Sources, adaptation and licensing

Adapted from the named upstream skills in mattpocock/skills and affaan-m/ECC.
Pinned revisions, original paths/links and original file SHA256 hashes are in
[skill-sources/sources.json](skill-sources/sources.json). Upstream copyright and
MIT notices are retained in [matt-LICENSE.txt](skill-sources/matt-LICENSE.txt)
and [ecc-LICENSE.txt](skill-sources/ecc-LICENSE.txt).

These are NOT verbatim installs. Generic/cloud-vendor examples were replaced with
this app's owner-auth, Prisma, source evidence, financial and privacy rules.
Mandatory interviews, tracker setup, background agents/parallel subagents,
external harness utilities and automatic paid model grading were not adopted.
Debugging can continue useful independent work when reproduction needs laptop
access; it does not request unredacted HARs. Tests scale to actual risk; simple
reversible edits do not require ritual test suites. Current user instructions and
the owner's migration/cost rules override generic workflow suggestions.

## Updating

Review upstream at an explicit new revision; never run an upstream installer or
copy an entire configuration over this project. Compare changed instructions,
retain the local scope/safety rules and licenses, update sources.json hashes, and
review the adapted diff. Do not auto-apply new network, payment, migration or
agent-delegation instructions. The .gitignore exceptions track only these three
SKILL.md files; unrelated local agent state remains ignored.
