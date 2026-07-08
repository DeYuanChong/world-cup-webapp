# World Cup 2026 Prediction Pool

A private prediction game for the 2026 FIFA World Cup. Sign in with Google, predict the full-time score of every match, pick the overall champion, and climb the leaderboard. Match results update automatically from [football-data.org](https://www.football-data.org/).

## Rules

- Predict the **90-minute score** (plus injury time) of each match. Extra time and penalties never count, so a draw is a valid prediction for knockout games too.
- **Exact score: 3 points.** Correct outcome (win/draw/loss) with a different score: **1 point.** Not stacked.
- **Champion pick: 5 points** if your team lifts the trophy. Locks 1 hour before the first quarter-final.
- Match predictions **lock 1 hour before kickoff** (enforced server-side).
- Everyone's predictions are visible to all signed-in users — shown as chips on each match card, color-coded by points once the match finishes.
- Leaderboard ties break on exact-score count; still-tied users share the rank.

## Local development

Prerequisites: Node 22+, Docker.

```bash
cp .env.example .env        # then fill in the values (see below)
docker compose up -d        # local Postgres 16
npm install                 # also generates the Prisma client
npx prisma migrate dev      # create the schema
npm run dev                 # http://localhost:3000
```

`.env` values:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | preset for the Docker Postgres |
| `AUTH_SECRET` | `npx auth secret` (or `openssl rand -base64 33`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console OAuth client; redirect URI `http://localhost:3000/api/auth/callback/google` |
| `FOOTBALL_DATA_API_KEY` | free at [football-data.org](https://www.football-data.org/client/register) |
| `ADMIN_EMAILS` | comma-separated Google emails that get the admin page |

The dev server runs a background sync every 5 minutes (`SYNC_INTERVAL_MS` to change); the first sync seeds all 104 fixtures. Admins can force one with the **Sync now** button on `/admin`, where they can also correct results manually — corrections are flagged (`manualOverride`) and survive future syncs.

Testing the locks: set `FAKE_NOW=2026-07-09T18:30:00Z` in `.env` to fake the clock (ignored in production).

```bash
npm run test    # unit tests (scoring, locks, API score extraction)
npm run lint
npm run build
```

## Deployment (Vercel + Neon)

1. Create a Neon Postgres database and apply migrations to it: `DATABASE_URL="<neon-url>" npx prisma migrate deploy` (repeat after any schema change — the Vercel build does not run migrations).
2. Import the repo into Vercel and set the env vars: `DATABASE_URL` (pooled Neon string), `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `FOOTBALL_DATA_API_KEY`, `ADMIN_EMAILS`, and `CRON_SECRET` (any long random string).
3. Add the production domain to the Google OAuth client (origin + `/api/auth/callback/google` redirect URI). Use the stable production domain, not per-deployment URLs — those sit behind Vercel's auth wall.
4. `vercel.json` schedules `GET /api/sync` once daily (the Hobby-plan cron maximum), authenticated by `CRON_SECRET`. For fresher scores on match days, use the admin **Sync now** button, or point an external pinger (e.g. cron-job.org) at `GET /api/sync` with header `Authorization: Bearer <CRON_SECRET>` every few minutes. On the Pro plan you can tighten the schedule in `vercel.json` instead.

## Architecture notes

Next.js App Router + Prisma 7/Postgres + Auth.js v5. Scores are computed at read time from pure functions in `src/lib/scoring.ts`; the sync (`src/lib/sync.ts`) reconciles API data with bulk inserts and only-what-changed updates so it stays fast over serverless-to-Neon connections. See `AGENTS.md` for the invariants that matter when changing the code (90-minute score extraction, manual-override semantics, server-side lock enforcement).
