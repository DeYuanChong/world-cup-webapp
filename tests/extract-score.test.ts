import { describe, expect, it } from "vitest";
import { extract90MinScore, type ApiScore } from "@/lib/football-data";

describe("extract90MinScore", () => {
  it("uses fullTime for matches decided in regular time", () => {
    const score: ApiScore = {
      winner: "HOME_TEAM",
      duration: "REGULAR",
      fullTime: { home: 2, away: 1 },
    };
    expect(extract90MinScore(score)).toEqual({ home: 2, away: 1 });
  });

  it("uses regularTime for extra-time matches (fullTime is the 120-minute score)", () => {
    const score: ApiScore = {
      winner: "AWAY_TEAM",
      duration: "EXTRA_TIME",
      fullTime: { home: 1, away: 2 }, // after 120 minutes
      regularTime: { home: 1, away: 1 }, // the score that counts
      extraTime: { home: 0, away: 1 },
    };
    expect(extract90MinScore(score)).toEqual({ home: 1, away: 1 });
  });

  it("uses regularTime for penalty shootouts and ignores penalty goals", () => {
    // Real v4 shape (Germany–Paraguay R32 2026): 1-1 after 90, 0-0 in ET,
    // 3-4 on pens — fullTime is cumulative (4-5).
    const score: ApiScore = {
      winner: "AWAY_TEAM",
      duration: "PENALTY_SHOOTOUT",
      fullTime: { home: 4, away: 5 },
      regularTime: { home: 1, away: 1 },
      extraTime: { home: 0, away: 0 },
      penalties: { home: 3, away: 4 },
    };
    expect(extract90MinScore(score)).toEqual({ home: 1, away: 1 });
  });

  it("derives fullTime − extraTime when regularTime is missing", () => {
    const score: ApiScore = {
      winner: "HOME_TEAM",
      duration: "EXTRA_TIME",
      fullTime: { home: 3, away: 2 },
      regularTime: null,
      extraTime: { home: 1, away: 0 },
    };
    expect(extract90MinScore(score)).toEqual({ home: 2, away: 2 });
  });

  it("also subtracts penalties when deriving a shootout score without regularTime", () => {
    const score: ApiScore = {
      winner: "AWAY_TEAM",
      duration: "PENALTY_SHOOTOUT",
      fullTime: { home: 4, away: 5 }, // 1-1 + 0-0 ET + 3-4 pens
      regularTime: null,
      extraTime: { home: 0, away: 0 },
      penalties: { home: 3, away: 4 },
    };
    expect(extract90MinScore(score)).toEqual({ home: 1, away: 1 });
  });

  it("returns null for a shootout without regularTime or a penalties breakdown", () => {
    const score: ApiScore = {
      winner: "HOME_TEAM",
      duration: "PENALTY_SHOOTOUT",
      fullTime: { home: 4, away: 3 },
      regularTime: null,
      extraTime: { home: 0, away: 0 },
      penalties: null,
    };
    expect(extract90MinScore(score)).toBeNull();
  });

  it("returns null when the 90-minute score cannot be determined", () => {
    const unplayed: ApiScore = {
      winner: null,
      duration: "REGULAR",
      fullTime: { home: null, away: null },
    };
    expect(extract90MinScore(unplayed)).toBeNull();

    const etWithoutBreakdown: ApiScore = {
      winner: "HOME_TEAM",
      duration: "EXTRA_TIME",
      fullTime: { home: 2, away: 1 },
      regularTime: null,
      extraTime: null,
    };
    expect(extract90MinScore(etWithoutBreakdown)).toBeNull();
  });

  it("treats a missing duration as regular time", () => {
    const score: ApiScore = {
      winner: "DRAW",
      duration: null,
      fullTime: { home: 0, away: 0 },
    };
    expect(extract90MinScore(score)).toEqual({ home: 0, away: 0 });
  });
});
