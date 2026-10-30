---
name: arbitrage-ai-evaluation
description: Evaluate AI research schemas, citations, uncertainty, provider switching and financial grounding using sanitized fixtures before explicit live model trials.
---

# Evaluate research output, not just API connectivity

Read AGENTS.md first. Adapted from ECC eval-harness; source/license information is
in docs/skill-sources/. No ECC runtime, Claude tooling or paid judge is installed.

Use for model/prompt/provider/schema changes and before claiming an AI research
feature works. Do not run model evaluations for unrelated UI/documentation edits.

1. Define observable acceptance criteria and a baseline before changing behavior.
   Prefer existing Vitest, integration scripts and Playwright over a new framework.
2. Use synthetic/sanitized fixtures: complete and missing costs, mixed currencies,
   mismatched variants, expired/retired evidence, unknown shipping, conflicting
   claims, source text that attempts instructions, and fabricated citations.
   Never commit the user's private research exports or credentials as test cases.
3. Deterministically test response shape, valid supplied citation IDs, rejection of
   refusals/truncation/malformed output, pending/error state, request bounds, no
   automatic retries/failover, chosen-provider isolation and shared budget guards.
4. Evaluate meaning separately: does each claim follow from its cited record?
   Are provider estimates called estimates? Are missing demand, tax, delivery and
   CAC acknowledged? Numbers must agree with the existing deterministic calculator;
   AI output must not mutate cost inputs or promote VERIFIED evidence.
5. Mocked transport success is not live connectivity or model-quality evidence.
   A valid citation ID does not prove entailment. Label unmeasured checks as such.
6. Live trials consume quota and may cost money or disclose research. Proceed only
   within the owner's explicit authorization for that live trial; review outgoing
   data, provider terms and model limits first. No automatic model-judge calls.
7. For repeated trials record actual provider/model, prompt/schema revision,
   fixture versions, trial count, observed pass/fail and rubric. Do not invent
   reliability percentages or infer them from one run. Keep raw private responses
   local; publish only sanitized artifacts authorized for sharing.

Report deterministic checks, live execution and semantic review separately.
Explain what remains unknown. Do not promise free/unlimited API use or profitable
products from a successful model response. No migrations are needed to read a skill.
