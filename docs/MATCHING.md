# Reviewed supplier product matching

Open **Matching**, or **Compare product identifiers** on a Discovery candidate.
This first version compares supplier catalogue records with existing research.
It does not automatically extract identifiers, merge research records, or match
eBay offers. It needs no new key, provider subscription, or model call.

1. On a listing already selected for investigation, record a sourced GTIN or
   both brand and manufacturer part number. A supplier SKU or CJ warehouse
   barcode is not necessarily either identifier. Check the manufacturer's
   documentation rather than relabelling supplier identifiers.
2. Record units per sold pack and exact variant specifications. Use an identical
   description only after inspecting size, colour, material and dimensions.
   STANDARD is an explicit operator assertion that no variant difference exists.
3. Record the same information on the other supplier listing. Add a source URL,
   past ISO observation time and an explanation of where the identifiers appear.
4. Review proposed matches and both sources. Confirm pack and variant, explain
   the comparison, then link. The other listing must still be unlinked.

GTIN accepts checksum-valid 8/12/13/14 ASCII digits and compares their padded
14-digit forms. This checks syntax, not GS1 ownership, authenticity, actual
fulfilment, or source accuracy. Brand/MPN and variant descriptions use Unicode
NFKC, case and whitespace normalization; punctuation is preserved. Product title
similarity is not a match criterion. Identifier claims remain operator-entered,
not independently certified.

A shared GTIN or brand + MPN can propose a match. Contradictory known GTIN,
brand, MPN, pack or variant blocks linking. Missing pack/variant prevents linking.
All listings already attached to the target research record must have compatible
recorded identities. If identifiers point to multiple research records, linking
is disabled until duplicates or identifiers are corrected. No automatic merge
or probability score is provided. At most 200 identifier-matching listings and
200 linked peers are queried; exceeding either bound disables linking. The
selector shows the latest 200 catalogue entries; `/matching?listing=ID` also
opens older entries, including through their Discovery link.

Identifiers are stored separately from provider responses. Imports and scheduled
CJ refreshes never overwrite them. Each save requires the current revision and
creates an immutable snapshot. Linked identities cannot be edited into a
conflict with their peers. Link acceptance rechecks identities, revisions,
expected research record, ambiguity and peer compatibility under the same
PostgreSQL transaction lock used by imports and candidate promotion. Stale forms
and simultaneous accepts fail safely.

Linking attaches one supplier listing to an existing Opportunity. It does not
copy prices or currencies, move quotes, merge evaluations, fill financial inputs,
or create demand/sourcing evidence. Supplier and quote histories stay on their
original listings. Research conclusions still need their own current evidence.

**Undo a reviewed link** removes that attachment with a correction reason. The
research record, evaluations, evidence and supplier history remain. Review any
costs or claims that relied on the removed listing; undo does not automatically
invalidate or rewrite research. Original candidate promotion is not an undoable
match here. Identifier revisions and LINK/UNLINK snapshots retain source URLs,
identifiers and context even if a catalogue row or research record is later
deleted. Latest 10 revisions/decisions are visible; full history is in PostgreSQL.

## Updating the Windows laptop

Stop the app with Ctrl+C, then run inside `arbitrage-finder-local`:

```bat
git pull --ff-only origin codex/product-research-automation
npx prisma generate
npx prisma migrate deploy
npm.cmd run dev -- --hostname 127.0.0.1
```

The migration only adds tables/indexes and an optional relation. Existing
catalogue, markets, costs and research remain. Keep normal database backups;
GitHub stores code, not your laptop database. No environment variable is added.

## Verification

```sh
npm test
npm run lint
npx tsc --noEmit
node --import tsx scripts/check-matching.ts
npm run build
npm run start -- --hostname 127.0.0.1
# Separate terminal with the production server running:
node --import tsx scripts/check-matching-http.ts
```

Database and HTTP checks use clearly labelled unique fixtures and remove them,
including their audit entries. They cover missing/conflicting identifiers,
ambiguous research records, stale revisions/target IDs, concurrent acceptance,
unchanged costs/evidence/currencies, refresh preservation, review bounds, audited
undo and protected/origin-checked forms. They do not call CJ or any marketplace.
