# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Turbopack dev server on :3000
npm run build        # production build
npm run start        # run a production build
npm run lint         # eslint
npx tsc --noEmit -p tsconfig.json   # type-check (no test runner is configured — this is the fastest correctness check)

npm run db:generate  # generate a Drizzle migration from lib/db/schema.ts
npm run db:migrate   # apply migrations (run after every schema.ts change)
npm run db:studio    # Drizzle Studio
npm run seed         # populate the exercise library (scripts/seedExercises.ts)
```

**Never run `npm run build` while `npm run dev` is running.** Both write to the same `.next`
directory; building alongside a live Turbopack dev server corrupts its build/manifest state
and causes intermittent Server Action failures (`Failed to fetch`, stray 500s) until the dev
server is stopped, `.next` is deleted, and it's restarted clean. If you need to verify a
production build, stop the dev server first (or run `next start` on a different port and stop
it again immediately after).

The app runs on Postgres (`DATABASE_URL`) — hosted on Railway both for production and for local
dev (a separate, smaller Postgres service dedicated to dev, since this project deliberately
avoids a Docker dependency). Copy `.env.local.example` to `.env.local` before first run and
point `DATABASE_URL` at your dev database; `APP_PASSCODE` and `SESSION_SECRET` are required for
the app to boot (passcode gate), `ANTHROPIC_API_KEY` is required for the AI features (equipment
scanning, AI Coach) to do anything beyond their graceful-failure fallback.

## Architecture

**Everything mutates through Server Actions in `lib/actions/*.ts`, one file per domain**
(`metrics`, `goals`, `equipment`, `gyms`, `routines`, `coach`, `settings`, `auth`) — there are no
API routes for app logic (the one exception is `app/api/equipment/[id]/photo/route.ts`, which
serves a stored photo blob as an image response since `<img src>` can't invoke a Server Action).

**`lib/db/schema.ts` is the single source of truth for domain types.** Every domain type used
elsewhere (`Goal`, `Metric`, `Equipment`, `Exercise`, `Gym`, `GymZone`, `CoachMessage`, ...) is a
Drizzle `InferSelectModel<typeof table>` re-exported from `lib/routines/types.ts` — despite the
name, that file is the general domain-type hub for the whole app, not just routines. Add new
domain types there. After editing `schema.ts`, always run `db:generate` then `db:migrate`.

**Auth is a single shared passcode, not per-user accounts.** `proxy.ts` (Next 16's rename of
`middleware.ts`) gates every route except a small allowlist, checking a signed session cookie
via `lib/auth/passcode.ts` (`verifySessionCookie`/`signSessionCookie`, HMAC-signed against
`SESSION_SECRET`) and redirecting to `/passcode` otherwise.

**The routine generator is a swappable strategy** (`lib/routines/`):
- `types.ts` — `RoutineGenerator` interface, `RoutineContext`/`GeneratedRoutine` shapes
- `trendAnalysis.ts` — shared ahead/on-track/behind trend logic, used by both generators *and*
  the dashboard's progress cards
- `equipmentFilter.ts` — shared "only suggest exercises the user actually has equipment for"
  filter, used by both generators
- `ruleBasedGenerator.ts` — deterministic day-split + exercise-rotation implementation
- `claudeGenerator.ts` — AI Coach-driven implementation; prescribes real target weights and
  drives progressive overload by reading the previous week's `routineExercises.targetWeightKg`
  for the same exercise and instructing the model to nudge it up
- `factory.ts` — picks the implementation via `ROUTINE_GENERATOR_STRATEGY` (`rule-based` |
  `claude`, set in `.env.local`)

**AI features share one calling convention**, used by both `lib/equipment/scanLabel.ts` (photo
→ equipment name/category) and `lib/coach/` (goal review, routine generation): a bare
`new Anthropic()` client (picks up `ANTHROPIC_API_KEY`), a model chosen via its own env var, and
`output_config.format` (`json_schema`) for structured output instead of prefill or
prompt-parsed JSON. Every call site wraps the request in try/catch and falls back to a
manual-entry/skip path rather than blocking the user — treat that graceful-degradation path as
required, not optional, when touching these. `lib/coach/persona.ts` holds one shared
`COACH_SYSTEM_PROMPT` (identity/tone only) plus a separate task-instruction constant per Coach
responsibility (e.g. `GOAL_VALIDATION_TASK`, `DAILY_WORKOUT_TASK`) — add new Coach
responsibilities the same way rather than growing the system prompt.

**Each AI call site has its own model default, deliberately not shared** — chosen per-task from
real side-by-side output comparisons, not by default policy: `EQUIPMENT_VISION_MODEL` (equipment
photo scanning) and `COACH_MODEL` (goal review) default to `claude-opus-4-8`; `ROUTINE_MODEL`
(weekly routine generation) defaults to `claude-haiku-4-5`. The split exists because Haiku's
goal-review output was internally inconsistent (suggested targets didn't match its own stated
reasoning) but its routine-generation output was reliable (respected the equipment constraint,
applied progressive overload correctly) — routine generation also runs weekly vs. goal review's
one-off, so the cost difference compounds there. Re-validate with a real side-by-side comparison
before changing either default, rather than assuming one model choice generalizes to the other.

**Equipment photos are resized client-side before upload** (`lib/equipment/resizeImage.ts`,
1600px/JPEG 0.85) — real phone camera photos are large enough to fail on real network
conditions and don't need full resolution for the model to read a label. `next.config.ts` also
raises `experimental.serverActions.bodySizeLimit` to `10mb` (default is 1MB) for the same
reason; keep both in place together.

**`equipmentPhotos.photo` is a `bytea` column defined via Drizzle's `customType`**
(`lib/db/schema.ts`) — pg-core has no built-in blob/binary column builder in the installed
drizzle-orm version, unlike sqlite-core's `blob()`. If a future column needs raw binary storage,
follow the same `customType<{ data: Buffer }>({ dataType: () => "bytea" })` pattern rather than
assuming a first-party builder exists.

**The service worker only registers in production** (`components/layout/ServiceWorkerRegistration.tsx`
checks `NODE_ENV`). Turbopack's dev chunks aren't content-hashed the same stable way a
production build's are, so a cache-first service worker in dev can silently serve stale/broken
JS after a rebuild. Don't remove this guard to "fix" PWA testing — instead build (`npm run
build`) and run (`npm run start`) a production instance on a separate port to test real PWA/
service-worker behavior, per the build-vs-dev warning above.
