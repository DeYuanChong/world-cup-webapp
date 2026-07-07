import { now } from "@/lib/clock";
import { prisma } from "@/lib/db";

export const LOCK_MS = 60 * 60 * 1000; // predictions lock 1 hour before kickoff

export function matchLockTime(kickoff: Date): Date {
  return new Date(kickoff.getTime() - LOCK_MS);
}

export function isMatchLocked(kickoff: Date, at: Date = now()): boolean {
  return at.getTime() >= matchLockTime(kickoff).getTime();
}

/**
 * The champion pick locks 1 hour before the earliest quarter-final kickoff
 * (the tournament was already underway when this pool launched). Returns null
 * before the first sync has populated matches — treated as not locked.
 */
export async function getChampionLockTime(): Promise<Date | null> {
  const firstQf = await prisma.match.findFirst({
    where: { stage: "QUARTER_FINALS" },
    orderBy: { kickoff: "asc" },
    select: { kickoff: true },
  });
  return firstQf ? matchLockTime(firstQf.kickoff) : null;
}

export async function isChampionPickLocked(at: Date = now()): Promise<boolean> {
  const lockTime = await getChampionLockTime();
  return lockTime !== null && at.getTime() >= lockTime.getTime();
}
