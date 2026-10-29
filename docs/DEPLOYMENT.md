# Private owner deployment runbook

## Prepared and verified

The application now has a single-owner password login and PostgreSQL sessions.
Every private page checks authorization before reading data, and every business
Server Action verifies the session and exact configured mutation Origin. A
protected route-group layout adds navigation/logout; /login and /api/health are
public. Health exposes status only. Missing configuration fails closed.

Passwords use salted scrypt (N=32768); session cookies carry random 256-bit tokens,
with only SHA-256 token digests in the database. Cookies are HttpOnly, SameSite
Strict and Secure for HTTPS origins. Sessions expire after eight hours, are
revoked on logout and are invalidated if APP_PASSWORD_HASH changes. Five failed
logins in a fifteen-minute window cause a fifteen-minute owner-wide lockout.
This is deliberately one owner, without self-registration, MFA or password-email
recovery. A fresh server process is required after changing environment values.

`npm run auth:init` creates a random local password, stores it privately outside
the checkout at `/workspace/.cloud-setup/owner-access.txt`, and writes ignored
`.env.local` with APP_PASSWORD_HASH and a local APP_ORIGIN. Existing files are not
overwritten. No credential is printed. Keep the private access file; do not upload
it, .env files, database contents or proxy credentials to GitHub or an image.
For production, set APP_PASSWORD_HASH through the host's secure environment
settings. This must be the actual runtime hash, not an outbound proxy-only secret
placeholder. Never send the password or hash in chat.

## Three remaining deployment operations

1. Choose a hosting account able to run this Node 24 Docker image and optionally
   a separate background worker. This environment has no connected deployment
   service, hosting account or domain; no public deployment has been performed.
2. Provision a managed PostgreSQL database named `arbitrage`, backups, and secure
   runtime configuration. Set APP_ORIGIN to the exact canonical HTTPS origin,
   APP_PASSWORD_HASH to the owner hash, DATABASE_URL to the provider connection
   string and SHADOW_DATABASE_URL to a distinct URL named `arbitrage_shadow`.
   The existing database safety guard requires those names; do not weaken it.
   migrate deploy does not use/reset a shadow database, but the config validates
   its distinct name. Verify provider permissions and TLS/CA requirements. Do not
   use the local trust-authenticated PostgreSQL cluster for public deployment.
3. Deploy the verified code/image, run migrations once, verify public readiness,
   login, logout, session cookies and a representative private workflow. Keep
   external schedules paused until you choose actual phrases and limits. Run the
   worker separately only if recurring discovery is wanted. Confirm costs with
   the chosen host; no paid hosting resource has been purchased here.

Do not copy APP_ORIGIN=http://127.0.0.1:3000 into production. Set the real HTTPS
origin before accepting external login. Configure the proxy to preserve the
canonical host. Public HTTP is rejected as APP_ORIGIN. TLS terminates at the host;
Secure cookies are selected from the configured external origin.

## Reproducible build and startup

```sh
# Ordinary host without a session interception proxy:
docker build -t arbitrage-finder .
# In the managed cloud executor, trust its provided CA via a build secret:
docker build --secret id=proxy_ca,src="$CODEX_PROXY_CERT" -t arbitrage-finder .
# Use your host's secure runtime environment; never embed values in the image:
# Migration/release command (same image/environment, once per release):
npx prisma migrate deploy
# Web command:
npm run start -- --hostname 0.0.0.0
# Optional separate worker command:
npm run discovery:worker
```

The Docker image runs as the non-root node user. It includes the pinned npm
lockfile dependencies, generated Prisma client, migrations and production build.
Development tools remain installed to support the TypeScript worker/migration
scripts. The build uses non-secret loopback database names solely for Prisma
client generation; it does not connect to a production database. .dockerignore
excludes .git, .env*, generated host outputs, node_modules and build caches.
Production secrets are runtime settings, never build arguments. If runtime
HTTPS requests need a custom CA, mount it read-only and use the supported Node
trust variable; do not disable TLS checks.

This image was built successfully and tested against a separate temporary
PostgreSQL container: all migrations, non-root execution, absence of .env/.git/CA
secret files, readiness and actual owner login passed. Temporary containers,
network and their generated test credentials are removed after validation.
A registry push and external hosting rollout remain unperformed.

## Validation and operations

```sh
npm test
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
npx tsx scripts/check-auth-http.ts
# Authenticated private workflow regressions, each creates/removes test sessions:
npx tsx scripts/check-discovery-http.ts
npx tsx scripts/check-research-http.ts
npx tsx scripts/check-sourcing-http.ts
npx tsx scripts/check-offers-http.ts
```

The auth HTTP check is local-only and uses the private generated owner credential
without printing it. It verifies redirects, actual sign-in, cookie flags, expired
and password-version-revoked sessions, direct action rejection, cross-origin
rejection, logout revocation and throttling; it restores the prior idle throttle
state. Keep test tools in a controlled development environment.

Database backups and restoring them are hosting operations; an image or GitHub
commit is not a backup of product research data. Keep a tested backup policy
before importing business data on a public host. No external account, ad spend,
Shopify mutation or supplier order is part of this deployment preparation.
