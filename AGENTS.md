<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project

Prediction-pool webapp for the 2026 FIFA World Cup (private group, tens of users). Users predict full-time scores of matches and the overall champion; a leaderboard ranks them. Results sync automatically from football-data.org. All predictions are deliberately visible to all signed-in users at all times (shown as chips on each match card), including before a match locks.

Deployed on Vercel with a Neon Postgres database; local dev uses Docker Postgres. Schema changes must be applied to production manually: `DATABASE_URL="<neon-url>" npx prisma migrate deploy` (the Vercel build does not run migrations).

## Commands

```bash
docker compose up -d          # start local Postgres 16 (db: worldcup)
npx prisma migrate dev        # apply migrations + regenerate client
npx prisma studio             # inspect the database
npm run dev                   # dev server (starts background score sync)
npm run test                  # vitest run (all unit tests)
npx vitest run tests/scoring.test.ts   # single test file
npm run build && npm run lint
```

Requires `.env` (copy from `.env.example`): Postgres URL, Auth.js secret, Google OAuth client, football-data.org API key, `ADMIN_EMAILS`.

## Architecture

Next.js App Router (TypeScript) + Prisma 7 / Postgres + Auth.js v5 (Google OAuth only, DB sessions). Prisma 7 uses the `prisma-client` generator (client generated into `src/generated/prisma`, gitignored) with the `@prisma/adapter-pg` driver adapter — instantiated only in `src/lib/db.ts`; CLI config lives in `prisma.config.ts`.

- **Score sync**: `src/instrumentation.ts` starts a background poller (every `SYNC_INTERVAL_MS`, default 5 min) that calls `syncMatches()` in `src/lib/sync.ts` — one `GET /v4/competitions/WC/matches` per poll (free tier: 10 req/min). The first sync seeds all matches and teams; there is no separate seed script. `/api/sync` triggers the same function: POST is admin-gated (the "Sync now" button); GET requires `Authorization: Bearer $CRON_SECRET` and is the Vercel Cron target (`vercel.json`, once daily — the Hobby-plan maximum). The last successful sync is recorded in the single-row `SyncState` table.
- **Sync must stay serverless-friendly**: it reconciles rather than upserts — bulk `createMany` for new rows, then per-row updates only for rows whose synced fields actually changed, in small `Promise.all` chunks with **no wrapping transaction**. A transaction around ~150 sequential statements times out from Vercel to Neon (each statement is a network round trip; Prisma's interactive-transaction limit is 5s). Partial syncs are fine — the next poll corrects them.
- **Scoring**: computed at read time (never stored) via pure functions in `src/lib/scoring.ts`. Exact score = 3 pts, correct outcome = 1 pt (not stacked), correct champion = 5 pts. Leaderboard tiebreak: most exact scores, then shared rank.
- **Mutations**: server actions in `src/app/actions/` (zod-validated); admin status is derived from the `ADMIN_EMAILS` env var at runtime (`src/lib/admin.ts`), never stored in the DB.

## Invariants — any change must respect these

1. **`Match.homeGoals90/awayGoals90` always mean the 90-minute (+injury time) score**, never extra time/penalties. football-data.org's `score.fullTime` is cumulative (`regularTime + extraTime + penalties` — verified against real v4 responses); `extract90MinScore()` in `src/lib/football-data.ts` handles the extraction (`regularTime` first, else subtract the later segments from `fullTime`). A knockout draw is a valid result. The raw API score object is stored in `Match.rawScore` for auditing.
2. **`Match.manualOverride = true` blocks sync from touching score fields** (`homeGoals90`, `awayGoals90`, `winnerTeamId`) — admin corrections must survive polling. Sync still updates status/kickoff/teams.
3. **All time comparisons go through `now()` in `src/lib/clock.ts`** (honors `FAKE_NOW` env outside production — used to test locks) and **locks are enforced server-side** in the server actions (match lock = kickoff − 1h; champion lock = earliest quarter-final kickoff − 1h). Client-side countdowns are cosmetic.
4. **`Match.winnerTeamId` (advancing winner, incl. extra time/pens) is separate from the 90-minute score** and is used only for the champion pick — never derive the champion from `homeGoals90`.
