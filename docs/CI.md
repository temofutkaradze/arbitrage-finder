# Automated quality checks

GitHub Actions runs `.github/workflows/quality.yml` on pull requests, pushes to
master/the working branch, or manual workflow dispatch. It uses Node 24, a fresh
PostgreSQL 17 service, frozen npm install, migrations, temporary owner settings,
lint, unit tests, production build, database checks and authenticated HTTP checks.

No repository secret is required. The password in the workflow belongs only to
the ephemeral CI database, not a laptop or production account. CJ/eBay credentials
are empty; these checks use fixtures and never request live catalogue/shipping,
FX refresh, orders, payments, ads or store publication. The discovery worker is
not started. Logs/archives/owner credentials are not uploaded as artifacts.

The job has read-only repository permission, a 20-minute timeout and cancels
obsolete runs on the same ref. It does not deploy, merge or publish. Branch
protection/required-check enforcement is not configured by this file; that is a
separate repository setting. GitHub Actions must be enabled and sufficient runner
minutes available for hosted checks to execute.

Find runs under GitHub → Actions → Quality checks. A successful local test does
not prove a hosted run passed; inspect the run result. Backup restore rehearsal,
Windows execution, live account entitlement and commercial feasibility are outside
this job and retain their separate validation requirements.
