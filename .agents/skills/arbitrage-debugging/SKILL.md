---
name: arbitrage-debugging
description: Diagnose reported failures or regressions in this arbitrage research app with a minimal reproducible signal, safe instrumentation and a focused fix.
---

# Diagnose a concrete failure

Read AGENTS.md first. This is a local adaptation of Matt Pocock's diagnosing-bugs
skill; attribution and license are in docs/skill-sources/. No plugin is required.

1. State the reported symptom and expected behavior. Trace the relevant existing
   code and tests; do not replace working architecture to fix a local failure.
2. Build the smallest useful reproduction: a deterministic unit test, disposable
   database fixture, owner-authenticated HTTP check, or bounded browser script.
   Match the actual symptom; a successful build alone does not reproduce a bug.
3. If reproduction is unavailable on the cloud machine, distinguish it from the
   laptop. Use safe configuration-presence checks and a redacted research export;
   never request .env, database dumps, passwords, tokens or an unredacted HAR.
   State this limit and continue independent read-only diagnosis where useful.
4. Rank plausible causes and test one discriminating change at a time. Log only
   non-secret state. Mock provider failures and time boundaries before making any
   explicitly authorized live request. Do not loop paid requests to reproduce.
5. Apply the smallest fix. For consequential logic, show a regression check that
   would catch the original symptom. Avoid tests that merely mirror implementation.
6. Remove temporary instrumentation and fixture data. Verify the focused check,
   then the required affected checks once. Report actual results and limitations.

Never reset/migrate a database as a debugging shortcut. Migration work requires
an explanation of exact changes and owner approval before it runs. Never access
other_project. Do not spawn agents or install debugging tools implicitly.
