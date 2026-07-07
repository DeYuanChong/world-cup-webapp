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
    const score: ApiScore = {
      winner: "HOME_TEAM",
      duration: "PENALTY_SHOOTOUT",
      fullTime: { home: 0, away: 0 },
      regularTime: { home: 0, away: 0 },
      extraTime: { home: 0, away: 0 },
      penalties: { home: 4, away: 2 },
    };
    expect(extract90MinScore(score)).toEqual({ home: 0, away: 0 });
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
