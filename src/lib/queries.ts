import { prisma } from "@/lib/db";
import { computeLeaderboard, type Score } from "@/lib/scoring";

/** 90-minute results of finished matches, keyed by match id. */
export async function getFinishedResults(): Promise<Map<number, Score>> {
  const finished = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      homeGoals90: { not: null },
      awayGoals90: { not: null },
    },
    select: { id: true, homeGoals90: true, awayGoals90: true },
  });
  return new Map(
    finished.map((m) => [m.id, { home: m.homeGoals90!, away: m.awayGoals90! }]),
  );
}

/** The champion (winner of the FINAL, incl. extra time/pens) or null while undecided. */
export async function getChampionTeamId(): Promise<number | null> {
  const final = await prisma.match.findFirst({
    where: { stage: "FINAL", status: "FINISHED" },
    select: { winnerTeamId: true },
  });
  return final?.winnerTeamId ?? null;
}

/**
 * Teams still in contention for the title, for annotating the champion-pick
 * dropdown (UI hint only — the server doesn't reject eliminated picks).
 * A team is alive if it reached the knockout bracket (appears in any
 * knockout-stage match) and has not lost a finished knockout match. The
 * third-place playoff is excluded entirely: its participants already lost a
 * semi-final and cannot become champion.
 */
export async function getAliveTeamIds(): Promise<Set<number>> {
  const knockout = await prisma.match.findMany({
    where: { stage: { notIn: ["GROUP_STAGE", "THIRD_PLACE"] } },
    select: { status: true, homeTeamId: true, awayTeamId: true, winnerTeamId: true },
  });
  const alive = new Set<number>();
  const eliminated = new Set<number>();
  for (const m of knockout) {
    for (const teamId of [m.homeTeamId, m.awayTeamId]) {
      if (teamId === null) continue;
      alive.add(teamId);
      if (m.status === "FINISHED" && m.winnerTeamId !== null && m.winnerTeamId !== teamId) {
        eliminated.add(teamId);
      }
    }
  }
  for (const id of eliminated) alive.delete(id);
  return alive;
}

export async function getLeaderboard() {
  const [users, results, championTeamId] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        image: true,
        predictions: { select: { matchId: true, homeGoals: true, awayGoals: true } },
        championPick: { select: { teamId: true } },
      },
    }),
    getFinishedResults(),
    getChampionTeamId(),
  ]);
  return computeLeaderboard(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      image: u.image,
      predictions: u.predictions,
      championTeamId: u.championPick?.teamId ?? null,
    })),
    results,
    championTeamId,
  );
}
