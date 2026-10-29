# Adopt the renamed work branch on your Windows laptop

The work branch is now `feature/product-research-automation`. Its 22 development
commits were re-attributed to the owner's GitHub account `temofutkaradze` using
GitHub's account-linked public noreply address. Author and committer dates,
messages and every historical file tree were preserved. The original two commits,
master and the separate existing PR branch were not rewritten.

Commit IDs changed because author metadata and parent IDs changed. Old local
history cannot be updated with a normal fast-forward pull. Preserve it as a
local backup branch and switch to the renamed remote branch. No hard reset,
forced checkout, folder deletion, database operation or credential copy is needed.
A verified complete pre-rewrite Git bundle is also retained privately in the
managed workspace outside this checkout; it is a rollback copy, not a public
backup branch or a guarantee of permanent cloud storage. Keep your existing
laptop checkout and normal backups too.

## One-time Windows CMD steps

Stop the app with Ctrl+C. Run these once from the existing checkout:

```bat
cd C:\Users\temof\arbitrage-finder-local
git status --short
git config --local user.name temofutkaradze
git config --local user.email 91618033+temofutkaradze@users.noreply.github.com
git config remote.origin.fetch "+refs/heads/feature/product-research-automation:refs/remotes/origin/feature/product-research-automation"
git fetch origin
git branch -m backup-before-profile-update
git switch --track -c feature/product-research-automation origin/feature/product-research-automation
```

The explicit fetch mapping is necessary for the original single-branch clone.
`backup-before-profile-update` retains your existing committed history. This
procedure does not discard uncommitted edits: Git carries compatible edits over
or refuses to switch if they conflict. If a command fails or a branch already
exists, stop and review the error before continuing; do not add reset/force flags.
Your ignored `.env`/`.env.local` stay in the same checkout; the new branch does not
track or replace them. PostgreSQL and the parent owner-access file are unchanged.

After switching successfully, start the app as usual:

```bat
npm.cmd ci
npx prisma generate
npx prisma migrate deploy
npm.cmd run dev -- --hostname 127.0.0.1
```

These startup steps also apply any earlier feature migrations if the laptop had
not yet received them. The identity/branch change itself adds no migration.

Future updates use:

```bat
git pull --ff-only origin feature/product-research-automation
```

The current cloud checkout has the same repository-local identity. AGENTS.md
records the owner's preference so later work preserves it. This changes Git
metadata and branch naming, not software provenance guarantees. Existing GitHub
activity records, old commit links/caches and unrelated branches may still contain
historical metadata. No unsigned commit is being represented as cryptographically
verified. The normal GitHub push still uses the session's existing authorization;
no new token/password is needed in chat.
