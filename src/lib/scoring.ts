export const POINTS_EXACT = 3;
export const POINTS_OUTCOME = 1;
export const POINTS_CHAMPION = 5;

export interface Score {
  home: number;
  away: number;
}

/**
 * Points for one match prediction against the 90-minute result:
 * exact score = 3, correct outcome (home win / away win / draw) = 1, else 0.
 * Not stacked — an exact score is 3 total. A draw is a valid outcome for
 * knockout matches too (only the 90-minute score counts).
 */
export function scorePrediction(pred: Score, result: Score): 0 | 1 | 3 {
  if (pred.home === result.home && pred.away === result.away) return POINTS_EXACT;
  if (Math.sign(pred.home - pred.away) === Math.sign(result.home - result.away)) {
    return POINTS_OUTCOME;
  }
  return 0;
}

export interface LeaderboardUser {
  id: string;
  name: string | null;
  image: string | null;
  predictions: { matchId: number; homeGoals: number; awayGoals: number }[];
  championTeamId: number | null;
}

export interface LeaderboardRow {
  userId: string;
  name: string | null;
  image: string | null;
  total: number;
  exactCount: number;
  outcomeCount: number;
  championHit: boolean;
  rank: number;
}

/**
 * Pure leaderboard computation. `results` must contain only finished matches
 * with a known 90-minute score. `championTeamId` is the winner of the FINAL
 * (including extra time/penalties) or null while undecided.
 * Rank: total desc, then exact-score count desc; users equal on both share a
 * rank (competition ranking: 1, 1, 3).
 */
export function computeLeaderboard(
  users: LeaderboardUser[],
  results: Map<number, Score>,
  championTeamId: number | null,
): LeaderboardRow[] {
  const rows = users.map((u) => {
    let total = 0;
    let exactCount = 0;
    let outcomeCount = 0;
    for (const p of u.predictions) {
      const result = results.get(p.matchId);
      if (!result) continue;
      const pts = scorePrediction({ home: p.homeGoals, away: p.awayGoals }, result);
      total += pts;
      if (pts === POINTS_EXACT) exactCount++;
      else if (pts === POINTS_OUTCOME) outcomeCount++;
    }
    const championHit =
      championTeamId !== null && u.championTeamId === championTeamId;
    if (championHit) total += POINTS_CHAMPION;
    return { userId: u.id, name: u.name, image: u.image, total, exactCount, outcomeCount, championHit, rank: 0 };
  });

  rows.sort((a, b) => b.total - a.total || b.exactCount - a.exactCount);
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    row.rank =
      prev && prev.total === row.total && prev.exactCount === row.exactCount
        ? prev.rank
        : i + 1;
  });
  return rows;
}
