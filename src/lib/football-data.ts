/** Client for the football-data.org v4 API (free tier: 10 requests/minute). */

export interface ApiGoals {
  home: number | null;
  away: number | null;
}

export interface ApiScore {
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT" | null;
  fullTime: ApiGoals;
  halfTime?: ApiGoals;
  regularTime?: ApiGoals | null;
  extraTime?: ApiGoals | null;
  penalties?: ApiGoals | null;
}

export interface ApiTeam {
  id: number | null; // null while a knockout slot is still TBD
  name: string | null;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
}

export interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  matchday: number | null;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: ApiScore;
}

/**
 * The 90-minute (+injury time) score — the scoring basis for predictions.
 *
 * For matches decided in regular time, score.fullTime IS the 90-minute score.
 * For matches that went to extra time, score.fullTime is the 120-minute score
 * (penalties never count toward fullTime), so the 90-minute score must come
 * from score.regularTime, or be derived as fullTime − extraTime when
 * regularTime is absent. Returns null when it cannot be determined — callers
 * must then leave any existing stored score untouched.
 */
export function extract90MinScore(
  score: ApiScore,
): { home: number; away: number } | null {
  const complete = (g: ApiGoals | null | undefined): g is { home: number; away: number } =>
    g != null && g.home != null && g.away != null;

  if (score.duration === "REGULAR" || score.duration == null) {
    return complete(score.fullTime) ? { home: score.fullTime.home, away: score.fullTime.away } : null;
  }
  // EXTRA_TIME or PENALTY_SHOOTOUT
  if (complete(score.regularTime)) {
    return { home: score.regularTime.home, away: score.regularTime.away };
  }
  if (complete(score.fullTime) && complete(score.extraTime)) {
    return {
      home: score.fullTime.home - score.extraTime.home,
      away: score.fullTime.away - score.extraTime.away,
    };
  }
  return null;
}

export async function fetchWorldCupMatches(): Promise<ApiMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY is not set — cannot sync scores");
  }
  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches",
    {
      headers: { "X-Auth-Token": apiKey },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `football-data.org returned ${res.status} ${res.statusText}: ${body.slice(0, 300)}`,
    );
  }
  const data = (await res.json()) as { matches?: ApiMatch[] };
  if (!Array.isArray(data.matches)) {
    throw new Error("football-data.org response had no matches array");
  }
  return data.matches;
}
