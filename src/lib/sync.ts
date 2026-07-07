import { prisma } from "@/lib/db";
import {
  fetchWorldCupMatches,
  extract90MinScore,
  type ApiMatch,
} from "@/lib/football-data";
import type { Prisma } from "@/generated/prisma/client";

function winnerTeamId(m: ApiMatch): number | null {
  if (m.status !== "FINISHED") return null;
  if (m.score.winner === "HOME_TEAM") return m.homeTeam.id;
  if (m.score.winner === "AWAY_TEAM") return m.awayTeam.id;
  return null; // DRAW (group stage) or undecided
}

interface TeamData {
  id: number;
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
}

interface MatchData {
  stage: string;
  group: string | null;
  matchday: number | null;
  kickoff: Date;
  status: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  duration: string | null;
  rawScore: Prisma.InputJsonValue;
  homeGoals90?: number;
  awayGoals90?: number;
  winnerTeamId?: number | null;
}

interface ExistingMatch {
  id: number;
  stage: string;
  group: string | null;
  matchday: number | null;
  kickoff: Date;
  status: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  duration: string | null;
  homeGoals90: number | null;
  awayGoals90: number | null;
  winnerTeamId: number | null;
  manualOverride: boolean;
  rawScore: unknown;
}

function matchChanged(ex: ExistingMatch, data: MatchData): boolean {
  if (
    ex.stage !== data.stage ||
    ex.group !== data.group ||
    ex.matchday !== data.matchday ||
    ex.status !== data.status ||
    ex.homeTeamId !== data.homeTeamId ||
    ex.awayTeamId !== data.awayTeamId ||
    ex.duration !== data.duration
  ) {
    return true;
  }
  if (ex.kickoff.getTime() !== data.kickoff.getTime()) return true;
  if (JSON.stringify(ex.rawScore ?? null) !== JSON.stringify(data.rawScore)) return true;
  if ("winnerTeamId" in data && ex.winnerTeamId !== data.winnerTeamId) return true;
  if (
    "homeGoals90" in data &&
    (ex.homeGoals90 !== data.homeGoals90 || ex.awayGoals90 !== data.awayGoals90)
  ) {
    return true;
  }
  return false;
}

// Serverless-to-hosted-Postgres round trips are slow (~100s of ms each), so a
// single transaction around per-row upserts times out. Instead: bulk-insert
// new rows, then update only rows that actually changed (a handful per poll
// once seeded), with modest concurrency. Atomicity doesn't matter here — a
// partially applied sync is corrected by the next poll.
async function runChunked(thunks: (() => Promise<unknown>)[], chunkSize = 10) {
  for (let i = 0; i < thunks.length; i += chunkSize) {
    await Promise.all(thunks.slice(i, i + chunkSize).map((t) => t()));
  }
}

/**
 * Fetches all World Cup matches from football-data.org and reconciles teams
 * and matches. The first run seeds the entire tournament. Matches with
 * manualOverride=true keep their admin-set score fields (homeGoals90,
 * awayGoals90, winnerTeamId); everything else still updates.
 */
export async function syncMatches(): Promise<{ teams: number; matches: number }> {
  const apiMatches = await fetchWorldCupMatches();

  // Collect unique teams across all matches (TBD slots have null ids).
  const teams = new Map<number, TeamData>();
  for (const m of apiMatches) {
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (t.id != null && t.name != null) {
        teams.set(t.id, {
          id: t.id,
          name: t.name,
          shortName: t.shortName ?? null,
          tla: t.tla ?? null,
          crest: t.crest ?? null,
        });
      }
    }
  }

  const [existingTeams, existingMatches] = await Promise.all([
    prisma.team.findMany(),
    prisma.match.findMany({
      select: {
        id: true,
        stage: true,
        group: true,
        matchday: true,
        kickoff: true,
        status: true,
        homeTeamId: true,
        awayTeamId: true,
        duration: true,
        homeGoals90: true,
        awayGoals90: true,
        winnerTeamId: true,
        manualOverride: true,
        rawScore: true,
      },
    }),
  ]);
  const teamById = new Map(existingTeams.map((t) => [t.id, t]));
  const matchById = new Map(existingMatches.map((m) => [m.id, m]));

  const newTeams: TeamData[] = [];
  const updates: (() => Promise<unknown>)[] = [];

  for (const t of teams.values()) {
    const ex = teamById.get(t.id);
    if (!ex) {
      newTeams.push(t);
    } else if (
      ex.name !== t.name ||
      ex.shortName !== t.shortName ||
      ex.tla !== t.tla ||
      ex.crest !== t.crest
    ) {
      updates.push(() => prisma.team.update({ where: { id: t.id }, data: t }));
    }
  }

  const newMatches: (MatchData & { id: number })[] = [];
  for (const m of apiMatches) {
    const goals90 = extract90MinScore(m.score);
    if (m.status === "FINISHED" && goals90 === null) {
      console.warn(
        `[sync] match ${m.id}: cannot determine 90-minute score (duration=${m.score.duration}); leaving stored score untouched`,
      );
    }
    const base: MatchData = {
      stage: m.stage,
      group: m.group,
      matchday: m.matchday,
      kickoff: new Date(m.utcDate),
      status: m.status,
      homeTeamId: m.homeTeam.id,
      awayTeamId: m.awayTeam.id,
      duration: m.score.duration,
      rawScore: m.score as unknown as Prisma.InputJsonValue,
    };
    const scoreFields = {
      // Omit goals when extraction failed so an existing value is preserved.
      ...(goals90 !== null
        ? { homeGoals90: goals90.home, awayGoals90: goals90.away }
        : {}),
      winnerTeamId: winnerTeamId(m),
    };

    const ex = matchById.get(m.id);
    if (!ex) {
      newMatches.push({ id: m.id, ...base, ...scoreFields });
      continue;
    }
    // Admin-corrected matches keep their score fields (see AGENTS.md).
    const data: MatchData = ex.manualOverride ? base : { ...base, ...scoreFields };
    if (matchChanged(ex, data)) {
      updates.push(() => prisma.match.update({ where: { id: m.id }, data }));
    }
  }

  await prisma.team.createMany({ data: newTeams, skipDuplicates: true });
  await prisma.match.createMany({ data: newMatches, skipDuplicates: true });
  await runChunked(updates);

  const syncedAt = new Date();
  await prisma.syncState.upsert({
    where: { id: 1 },
    create: { id: 1, lastSyncedAt: syncedAt },
    update: { lastSyncedAt: syncedAt },
  });

  return { teams: teams.size, matches: apiMatches.length };
}
