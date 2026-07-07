import { afterEach, describe, expect, it } from "vitest";
import { isMatchLocked, matchLockTime } from "@/lib/locks";
import { now } from "@/lib/clock";

const kickoff = new Date("2026-07-10T19:00:00Z");

describe("match locks", () => {
  it("locks exactly 1 hour before kickoff", () => {
    expect(matchLockTime(kickoff).toISOString()).toBe("2026-07-10T18:00:00.000Z");
  });

  it("is open strictly before the lock time and locked from the boundary on", () => {
    expect(isMatchLocked(kickoff, new Date("2026-07-10T17:59:59Z"))).toBe(false);
    expect(isMatchLocked(kickoff, new Date("2026-07-10T18:00:00Z"))).toBe(true);
    expect(isMatchLocked(kickoff, new Date("2026-07-10T19:30:00Z"))).toBe(true);
  });
});

describe("clock FAKE_NOW override", () => {
  afterEach(() => {
    delete process.env.FAKE_NOW;
  });

  it("returns the faked time outside production", () => {
    process.env.FAKE_NOW = "2026-07-09T12:00:00Z";
    expect(now().toISOString()).toBe("2026-07-09T12:00:00.000Z");
  });

  it("falls back to the real clock for an invalid FAKE_NOW", () => {
    process.env.FAKE_NOW = "not-a-date";
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(5000);
  });
});
