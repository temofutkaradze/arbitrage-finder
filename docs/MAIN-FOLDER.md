# Consolidate the two laptop folders

Decision: keep the current working application and its configuration, preserve the
old folder in full, and archive the original owner context. Do not overlay old src,
Prisma schema, generated client, lockfile or .env onto the new checkout.

Old calculator/profit tests remain unchanged. Discovery navigation and candidate
selection are covered by the new authenticated workflow. Keep the new bounded
CJ search, explicit review, dated source records and JSON import. The old CSV
browser preview, URL-prefilled manual form and deep search pagination are not
restored: they lack the new observation/identity requirements and are not required
for the working path. This is an intentional selection, not a claim of identical
features. Original source remains in the untouched old-folder backup and supplied ZIP.

## Windows CMD steps

First stop the app and discovery worker with Ctrl+C, and close project editor windows.
In the working `arbitrage-finder-local` folder fetch the updated work branch:

```cmd
cd /d C:\Users\temof\arbitrage-finder-local
git pull --ff-only origin feature/product-research-automation
```

Then move outside both project folders and run a preview:

```cmd
cd /d C:\Users\temof
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\temof\arbitrage-finder-local\scripts\move-to-main-folder.ps1" -WhatIf
```

If the preview names the expected folders, run the move:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\temof\arbitrage-finder-local\scripts\move-to-main-folder.ps1"
```

The old `C:\arbitrage-finder` becomes a uniquely named
`C:\arbitrage-finder-before-DATE-SUFFIX`. The complete working clone moves to
`C:\arbitrage-finder`, including .git and ignored .env/.env.local. It is a same-drive
folder rename, not a partial file copy. No migrations, database copies, reset,
secret editing, npm installation or Git checkout is performed by the helper.
If the second rename fails, it attempts to put the old destination back. Windows
execution is not independently verified from the Linux cloud; -WhatIf performs
preflight without moving folders. Locks or permissions can still block a real move.

Start from the new location:

```cmd
cd /d C:\arbitrage-finder
npm run dev -- --hostname 127.0.0.1
```

Your current branch remains `feature/product-research-automation`; a folder name
is independent from a Git branch. GitHub master contains the same consolidated
code after the fast-forward merge. No branch or backup is deleted by this helper.
The current working .env settings continue to select the same PostgreSQL database.
The old folder's .env stays in the old backup; configurations and databases are
not merged. Cloud tests do not prove the laptop's migration or DB state.

The generated owner password file in the old working parent
`C:\Users\temof\.cloud-setup\owner-access.txt` stays there. It is not needed for
runtime startup if .env.local is already configured; retain it privately for access.
Database backups also stay where they already are. After the move, the default
backup-helper output parent changes; choose an explicit private --output-dir if
you want backups to continue in the previous folder (see LOCAL-BACKUP.md).
