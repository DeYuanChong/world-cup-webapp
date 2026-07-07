import { describe, expect, it } from "vitest";
import {
  computeLeaderboard,
  scorePrediction,
  type LeaderboardUser,
  type Score,
} from "@/lib/scoring";

const s = (home: number, away: number): Score => ({ home, away });

describe("scorePrediction", () => {
  it("gives 3 points for the exact score (not stacked with the outcome point)", () => {
    expect(scorePrediction(s(2, 1), s(2, 1))).toBe(3);
    expect(scorePrediction(s(0, 0), s(0, 0))).toBe(3);
  });

  it("gives 1 point for the correct outcome with a different score", () => {
    expect(scorePrediction(s(1, 0), s(3, 1))).toBe(1); // home win
    expect(scorePrediction(s(0, 2), s(1, 4))).toBe(1); // away win
    expect(scorePrediction(s(1, 1), s(2, 2))).toBe(1); // draw
  });

  it("gives 0 points for the wrong outcome", () => {
    expect(scorePrediction(s(2, 0), s(0, 2))).toBe(0);
    expect(scorePrediction(s(1, 1), s(1, 0))).toBe(0);
    expect(scorePrediction(s(0, 1), s(1, 1))).toBe(0);
  });

  it("treats a 90-minute knockout draw as a scoreable result", () => {
    // e.g. a round-of-16 game that went to penalties: 90-minute score 1-1
    expect(scorePrediction(s(1, 1), s(1, 1))).toBe(3);
    expect(scorePrediction(s(2, 2), s(1, 1))).toBe(1);
    expect(scorePrediction(s(2, 1), s(1, 1))).toBe(0);
  });
});

describe("computeLeaderboard", () => {
  const user = (
    id: string,
    predictions: LeaderboardUser["predictions"],
    championTeamId: number | null = null,
  ): LeaderboardUser => ({ id, name: id, image: null, predictions, championTeamId });

  const results = new Map<number, Score>([
    [1, s(2, 1)],
    [2, s(0, 0)],
  ]);

  it("sums match points and counts exact/outcome hits", () => {
    const rows = computeLeaderboard(
      [
        user("alice", [
          { matchId: 1, homeGoals: 2, awayGoals: 1 }, // exact: 3
          { matchId: 2, homeGoals: 1, awayGoals: 1 }, // outcome: 1
        ]),
      ],
      results,
      null,
    );
    expect(rows[0]).toMatchObject({ total: 4, exactCount: 1, outcomeCount: 1 });
  });

  it("ignores predictions for matches without a finished result", () => {
    const rows = computeLeaderboard(
      [user("alice", [{ matchId: 99, homeGoals: 1, awayGoals: 0 }])],
      results,
      null,
    );
    expect(rows[0].total).toBe(0);
  });

  it("adds 5 points for the correct champion pick only once decided", () => {
    const users = [user("alice", [], 7), user("bob", [], 8)];
    expect(computeLeaderboard(users, results, null).map((r) => r.total)).toEqual([0, 0]);
    const decided = computeLeaderboard(users, results, 7);
    expect(decided.find((r) => r.userId === "alice")).toMatchObject({
      total: 5,
      championHit: true,
    });
    expect(decided.find((r) => r.userId === "bob")).toMatchObject({
      total: 0,
      championHit: false,
    });
  });

  it("breaks point ties by exact-score count, then shares ranks (1, 1, 3)", () => {
    const rows = computeLeaderboard(
      [
        // 3 points via one exact score
        user("exact", [{ matchId: 1, homeGoals: 2, awayGoals: 1 }]),
        // 3 points via three outcome hits
        user("outcomes", [
          { matchId: 1, homeGoals: 1, awayGoals: 0 },
          { matchId: 2, homeGoals: 1, awayGoals: 1 },
          { matchId: 3, homeGoals: 1, awayGoals: 0 },
        ]),
        // identical to "exact" — must share rank 1
        user("exact2", [{ matchId: 1, homeGoals: 2, awayGoals: 1 }]),
      ],
      new Map<number, Score>([
        [1, s(2, 1)],
        [2, s(0, 0)],
        [3, s(2, 0)],
      ]),
      null,
    );
    expect(rows.map((r) => [r.userId, r.rank])).toEqual([
      ["exact", 1],
      ["exact2", 1],
      ["outcomes", 3],
    ]);
  });
});
