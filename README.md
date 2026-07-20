# Fitness Tracker

A personal fitness tracker: import historical metrics, log weekly weight/body-fat entries, set 12-week goals, get a generated weekly workout routine based on your equipment and progress, and see it all on a dashboard. Installable as a PWA.

## Stack

- Next.js 16 (App Router, TypeScript), deployed to Railway
- Postgres (Railway) + Drizzle ORM
- Server Actions for all mutations (no API routes)
- Tailwind + shadcn/ui (Base UI primitives)
- Recharts for dashboard charts
- PapaParse / SheetJS for CSV/XLSX import
- Claude (Anthropic API) — AI Coach (goal review, weekly routine generation) and equipment
  photo scanning; see `lib/coach/` and `lib/equipment/scanLabel.ts`

## Getting started

```bash
npm install
cp .env.local.example .env.local   # edit DATABASE_URL, APP_PASSCODE, SESSION_SECRET
npm run db:migrate
npm run seed                       # seeds the exercise library
npm run dev
```

Open http://localhost:3000 — you'll be asked for the passcode set in `.env.local` (`APP_PASSCODE`).

Needs a Postgres database to connect to — either a Railway-hosted instance (recommended, keeps
dev on the same platform as production) or any local/other Postgres. Set its connection string
as `DATABASE_URL`.

## Scripts

- `npm run dev` / `build` / `start` / `lint`
- `npm run db:generate` — generate a Drizzle migration from `lib/db/schema.ts`
- `npm run db:migrate` — apply migrations
- `npm run db:studio` — open Drizzle Studio
- `npm run seed` — populate the exercise library (`scripts/seedExercises.ts`)

## Routine generator

`lib/routines/` implements the weekly routine generator as a swappable strategy:

- `types.ts` — the `RoutineGenerator` interface and shared types
- `trendAnalysis.ts` — shared ahead/on-track/behind trend logic (used by both the generator and the dashboard)
- `ruleBasedGenerator.ts` — the deterministic day-split/exercise-rotation implementation
- `claudeGenerator.ts` — the AI Coach-driven implementation (equipment-aware selection, real
  progressive overload); defaults to `claude-haiku-4-5` via `ROUTINE_MODEL`
- `factory.ts` — picks the implementation via `ROUTINE_GENERATOR_STRATEGY` (`rule-based` | `claude`)

## Deploying

Hosted on Railway: one project with two services (the Next.js app, sourced from this repo, and
a Postgres database), plus a separate Postgres instance for local dev. The app service's Start
Command runs `npm run db:migrate && npm run start` so schema changes apply on every deploy.
