# Run on your laptop first

No Render account, public database or subscription is needed. The app and your
PostgreSQL service run on the same laptop. pgAdmin is a management tool; PostgreSQL
must be running. Keep the app bound to 127.0.0.1. Laptop data stays on the laptop
and is separate from the cloud environment's twenty technical CJ candidates.

## Windows / PowerShell

Install Node.js 24 LTS and Git for Windows if missing. PostgreSQL/pgAdmin are
already installed. Open a fresh PowerShell window and check:

```powershell
node -v
git --version
```

Download the complete branch into a NEW folder, preserving any older local copy:

```powershell
cd $HOME
 git clone --branch codex/product-research-automation --single-branch https://github.com/temofutkaradze/arbitrage-finder.git arbitrage-finder-local
cd arbitrage-finder-local
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1
```

The execution-policy flag applies to this invocation, not your machine-wide
policy. If an organisation's policy blocks execution, use the manual path below;
do not weaken an enforced organisational policy. If the repository is private,
use GitHub's normal Git credential flow, not a token pasted into a clone URL.

The script asks for the local PostgreSQL role password (usually the postgres
role created during installation), NOT pgAdmin's master password. It is hidden
while typed, URL-encoded and saved to ignored .env without printing it. If you use
a different role/port, pass `-DatabaseUser your_role -DatabasePort 5433`.
Existing .env is preserved. Database overrides in .env.local cause a stop for
manual reconciliation rather than migrating one database while the app uses
another. Never send these files or passwords in chat.

Only `arbitrage` and `arbitrage_shadow` are created, if absent, using your local
role. Existing databases and their data are preserved. If `arbitrage` already
contains valuable data, take a pgAdmin backup before migrations. A nonempty
unmanaged database can require a migration baseline: if setup reports this,
stop and share only the error text with credentials masked. NEVER run migrate
reset or drop databases to make setup succeed.

After successful setup:

```powershell
npm.cmd run dev -- --hostname 127.0.0.1
```

In your laptop browser open `http://127.0.0.1:3000/login`. Keep using this exact
host rather than swapping to localhost: APP_ORIGIN is checked on mutations.
Retrieve your generated owner password privately:

```powershell
notepad ..\.cloud-setup\owner-access.txt
```

This is a separate app password, not the PostgreSQL password. Do not upload it or
share it. Settings are in ignored .env.local. Existing auth files are never
silently overwritten. Keep the parent folder private to your computer account.
Leave the terminal running; Ctrl+C stops the app. Start it again with the same
npm command. PostgreSQL must also be running. If port 3000 is occupied, stop your
older app process or deliberately change BOTH the server port and APP_ORIGIN.

Optional CJ access: add your own CJ API Key/access token as CJ_ACCESS_TOKEN to
the laptop's ignored .env, then restart the app. Cloud-injected credentials do
not automatically transfer to a laptop and are not included in GitHub. No CJ key
is needed simply to sign in or test manual workflows. eBay access is optional.
Recurring discovery requires a separate `npm.cmd run discovery:worker` terminal
and explicitly enabled schedules; none are enabled automatically.

## Manual path / macOS / Linux

Clone the same branch. In the checkout create .env privately with DATABASE_URL
and SHADOW_DATABASE_URL pointing to your LOCAL PostgreSQL's `arbitrage` and
`arbitrage_shadow`. URL-encode special characters in the password. Do not use
production/remote credentials with this local helper.

```sh
npm ci
npx tsx scripts/prepare-local-db.ts
npx prisma generate
npx prisma migrate deploy
npm run auth:init
npm run dev -- --hostname 127.0.0.1
```

The helper only permits matching loopback server/role connections and the two
protected database names. Existing .env.local must be reconciled manually if it
already exists; auth:init refuses to overwrite it. Commands use the current
checkout as working directory. The private auth file is next to the checkout at
../.cloud-setup/owner-access.txt, so no /workspace path is required.

## Verification limits

The Node helper is validated against local PostgreSQL and all unit/lint/type
checks pass. The PowerShell wrapper cannot be executed in the Linux cloud
executor when PowerShell is unavailable; first execution on the actual Windows
laptop remains a necessary check. This chat cannot directly access or start your
laptop's processes. Share errors without passwords/connection strings if a step
fails. GitHub backs up code, not your PostgreSQL data; use database backups too.
