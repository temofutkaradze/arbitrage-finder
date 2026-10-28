# Phase 3: install Milestone 2 files (Windows CMD)

Your `.env` is NOT in this ZIP and is never touched.

## Files in this ZIP that REPLACE existing ones
`prisma.config.ts`, `prisma/schema.prisma`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
(Back up first if you changed them, e.g. `copy prisma.config.ts prisma.config.ts.bak`.)
`src/app/page.module.css` from the starter is now unused; you may delete it.

## 1. Extract (from C:\arbitrage-finder)
    cd /d C:\arbitrage-finder
    tar -xf arbitrage-finder-phase3.zip

## 2. Dev dependencies (vitest 5 needs @types/node 22 or newer; the starter pins 20)
    npx vitest --version
If that errors, or npm complained about vitest earlier, run:
    npm i -D --save-exact vitest@5.0.5
    npm i -D @types/node@22

## 3. Scripts
    npm pkg set "scripts.test=vitest run" "scripts.seed:sample=tsx prisma/seed-sample.ts"

## 4. Generate client, create tables, test, run
    npx prisma generate
    npx prisma migrate dev --name init
    npm test
    npm run dev
Open http://localhost:3000

Optional: one clearly-labelled SAMPLE row (excluded from all metrics):
    npm run seed:sample

Never run `prisma migrate reset` (it wipes the arbitrage database).
