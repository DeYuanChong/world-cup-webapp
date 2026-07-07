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

/**
 * Fetches all World Cup matches from football-data.org and upserts teams and
 * matches. The first run seeds the entire tournament. Matches with
 * manualOverride=true keep their admin-set score fields (homeGoals90,
 * awayGoals90, winnerTeamId); everything else still updates.
 */
export async function syncMatches(): Promise<{ teams: number; matches: number }> {
  const apiMatches = await fetchWorldCupMatches();

  // Collect unique teams across all matches (TBD slots have null ids).
  const teams = new Map<
    number,
    { id: number; name: string; shortName: string | null; tla: string | null; crest: string | null }
  >();
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

  const overridden = new Set(
    (
      await prisma.match.findMany({
        where: { manualOverride: true },
        select: { id: true },
      })
    ).map((m) => m.id),
  );

  const syncedAt = new Date();
  const ops: Prisma.PrismaPromise<unknown>[] = [];

  for (const t of teams.values()) {
    ops.push(
      prisma.team.upsert({
        where: { id: t.id },
        create: t,
        update: { name: t.name, shortName: t.shortName, tla: t.tla, crest: t.crest },
      }),
    );
  }

  for (const m of apiMatches) {
    const base = {
      stage: m.stage,
      group: m.group,
      matchday: m.matchday,
      kickoff: new Date(m.utcDate),
      status: m.status,
      homeTeamId: m.homeTeam.id,
      awayTeamId: m.awayTeam.id,
      duration: m.score.duration,
      rawScore: m.score as unknown as Prisma.InputJsonValue,
      lastSyncedAt: syncedAt,
    };

    const goals90 = extract90MinScore(m.score);
    if (m.status === "FINISHED" && goals90 === null) {
      console.warn(
        `[sync] match ${m.id}: cannot determine 90-minute score (duration=${m.score.duration}); leaving stored score untouched`,
      );
    }
    const scoreFields = {
      // Omit goals when extraction failed so an existing value is preserved.
      ...(goals90 !== null
        ? { homeGoals90: goals90.home, awayGoals90: goals90.away }
        : {}),
      winnerTeamId: winnerTeamId(m),
    };

    ops.push(
      prisma.match.upsert({
        where: { id: m.id },
        create: { id: m.id, ...base, ...scoreFields },
        // Admin-corrected matches keep their score fields (see AGENTS.md).
        update: overridden.has(m.id) ? base : { ...base, ...scoreFields },
      }),
    );
  }

  await prisma.$transaction(ops);
  return { teams: teams.size, matches: apiMatches.length };
}
