# Local PostgreSQL backup and recovery

GitHub stores the application code. PostgreSQL stores products, markets, inputs,
evidence and research history. A research TXT report cannot restore that data.
This helper creates a native PostgreSQL custom-format database archive, outside
the code checkout, plus a timestamp/version/SHA-256 manifest. It does not reset,
restore, migrate, or drop a database. Backups are manual; no scheduler is added.

## Windows: create a backup

PostgreSQL must be running. Open CMD in the usual project folder:

```bat
cd C:\Users\temof\arbitrage-finder-local
npm.cmd run db:backup
```

`pg_dump` and `pg_restore` must be installed and on PATH. These are PostgreSQL
command-line tools, separate from the pgAdmin interface. If the command says they
could not start, find your installed version under `C:\Program Files\PostgreSQL`.
Pass its **bin folder**, for example (replace 17 with your actual version):

```bat
npm.cmd run db:backup -- --pg-bin "C:\Program Files\PostgreSQL\17\bin"
```

Use pg_dump from the same PostgreSQL major version as your server when possible;
an older pg_dump cannot back up a newer server. Keep matching pg_restore tools
available for recovery. This script does not install or change PostgreSQL.

By default each run creates a new uniquely named subfolder under:

```text
C:\Users\temof\arbitrage-finder-backups\arbitrage-DATE-UNIQUE-ID\
  database.dump
  manifest.json
```

The command prints the exact archive path and SHA-256 only. Existing backups
are preserved; there is no retention/deletion policy. Check available disk space.
To choose another private destination outside the project:

```bat
npm.cmd run db:backup -- --pg-bin "C:\Program Files\PostgreSQL\17\bin" --output-dir "D:\Private Backups\Arbitrage"
```

The helper loads `.env` files in Next development precedence, as local app startup
does. An already set process DATABASE_URL takes precedence. Only loopback
PostgreSQL for `arbitrage` with an explicit role is allowed. The only accepted
URL query option is `schema=public`; other options stop for manual review.
It never places the password or connection URL in command-line arguments or logs.
Unrelated application secrets and inherited libpq service/options are not passed
to PostgreSQL tools. The dump uses PostgreSQL's consistent snapshot, so ordinary
writes do not require stopping the app. Avoid migrations/schema changes during
a backup. A ten-minute tool timeout stops incomplete attempts.

## What is included

The application database schema, business records, migration history and sequences
are included. Ownership and privileges are not saved. Table definitions for owner
sessions and login throttling are included, but their **data is excluded**: old
logins and lockouts should not become active after recovery. A restored app
requires a new sign-in using its configured owner password.

Not included: code, PostgreSQL roles/passwords, `.env`, `.env.local`, owner password
file, provider account access, or other project databases. Retain the relevant
GitHub commit/checkout alongside your recovery notes. Separately preserve your
ignored local configuration and `..\.cloud-setup\owner-access.txt` in a secure
location. Never commit or send credentials or database dumps in chat.

These archives contain private business data and are **not encrypted by this
helper**. POSIX files/directories use restrictive modes; on Windows protection
comes from the parent folder's Windows permissions. Use a private folder and
protected/encrypted storage, and copy a backup to a separate drive: a backup on
the same laptop alone does not protect against losing the laptop. Folder names,
manifest and hash are not substitutes for actual data protection.

## Validation and recovery practice

A successful run checks the PGDMP header, runs `pg_restore --list` and records the
archive's SHA-256. This checks the archive index, not a full recovery. Recompute
the hash after copying the file and compare with manifest.json:

```powershell
Get-FileHash -Algorithm SHA256 "C:\path\to\database.dump"
```

Practice restoring into a **new, separate test database** before relying on a
backup. In pgAdmin create `arbitrage_restore_check_20261029` (choose a fresh name),
then Restore the custom-format `database.dump` into that test database. Disable
restoring ownership/privileges. Inspect representative products, inputs, evidence,
and migration records. This helper never changes DATABASE_URL to the test DB.

Alternatively use the matching PostgreSQL bin tools in CMD. These example commands
use the usual local role `postgres` and port 5432; use your actual role/port. The
password prompts are for PostgreSQL, not pgAdmin's master password. Never put the
password in the command. Choose a NEW test database name on each rehearsal:

```bat
"C:\Program Files\PostgreSQL\17\bin\createdb.exe" -h 127.0.0.1 -p 5432 -U postgres -W arbitrage_restore_check_20261029
"C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" -h 127.0.0.1 -p 5432 -U postgres -W --no-owner --no-privileges --single-transaction --exit-on-error -d arbitrage_restore_check_20261029 "C:\path\to\database.dump"
```

Stop if either command fails. Do not restore over the working `arbitrage`
database or reset it to resolve an error. Actual replacement/recovery of the
working database should be planned separately after verifying the archive and
preserving its current contents. Restoring untrusted dumps can execute SQL;
use archives from your own trusted backups.

## Developer verification

Unit tests cover local URL restrictions, encoded credentials, argument validation,
and isolation of subprocess environment variables. On the Linux test executor,
with the matching PostgreSQL bin tools and libraries available:

```sh
node --import tsx scripts/check-backup.ts --pg-bin /path/to/postgresql/bin
```

This creates a real backup, restores it into a brand-new temporary PostgreSQL
cluster on a loopback ephemeral port, compares fingerprints for all public
business tables and migration history, checks excluded sessions, and exercises
failed-backup cleanup. Test source fixtures and the isolated cluster/archive are
removed; the source database is never restored over. This is a developer test,
not an unattended recovery command for a laptop. Native Windows execution still
needs checking on the operator's laptop; the cloud executor runs Linux.
