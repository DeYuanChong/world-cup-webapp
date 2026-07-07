"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isMatchLocked } from "@/lib/locks";

const schema = z.object({
  matchId: z.number().int(),
  homeGoals: z.number().int().min(0).max(99),
  awayGoals: z.number().int().min(0).max(99),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function savePrediction(input: {
  matchId: number;
  homeGoals: number;
  awayGoals: number;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid score." };
  const { matchId, homeGoals, awayGoals } = parsed.data;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { kickoff: true, homeTeamId: true, awayTeamId: true },
  });
  if (!match) return { ok: false, error: "Unknown match." };
  if (match.homeTeamId === null || match.awayTeamId === null) {
    return { ok: false, error: "Teams are not decided yet." };
  }
  // Authoritative lock check — the client UI is only cosmetic.
  if (isMatchLocked(match.kickoff)) {
    return { ok: false, error: "Predictions are locked for this match." };
  }

  await prisma.prediction.upsert({
    where: { userId_matchId: { userId: session.user.id, matchId } },
    create: { userId: session.user.id, matchId, homeGoals, awayGoals },
    update: { homeGoals, awayGoals },
  });

  revalidatePath("/");
  revalidatePath(`/matches/${matchId}`);
  return { ok: true };
}
