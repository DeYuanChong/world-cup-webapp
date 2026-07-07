"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/app/actions/predictions";

async function requireAdmin(): Promise<string | null> {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.email)) {
    return "Admin access required.";
  }
  return null;
}

function revalidateAll(matchId: number) {
  revalidatePath("/");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/champion");
  revalidatePath("/admin");
}

const updateSchema = z.object({
  matchId: z.coerce.number().int(),
  homeGoals90: z.coerce.number().int().min(0).max(99),
  awayGoals90: z.coerce.number().int().min(0).max(99),
  finished: z.boolean(),
  // Advancing winner (knockout only); empty string = leave/clear undecided.
  winnerTeamId: z
    .string()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int().nullable()),
});

/** Manually corrects a result and flags it so sync won't overwrite it. */
export async function adminUpdateResult(formData: FormData): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const parsed = updateSchema.safeParse({
    matchId: formData.get("matchId"),
    homeGoals90: formData.get("homeGoals90"),
    awayGoals90: formData.get("awayGoals90"),
    finished: formData.get("finished") === "on",
    winnerTeamId: formData.get("winnerTeamId") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const { matchId, homeGoals90, awayGoals90, finished, winnerTeamId } = parsed.data;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { homeTeamId: true, awayTeamId: true },
  });
  if (!match) return { ok: false, error: "Unknown match." };
  if (
    winnerTeamId !== null &&
    winnerTeamId !== match.homeTeamId &&
    winnerTeamId !== match.awayTeamId
  ) {
    return { ok: false, error: "Winner must be one of the two teams." };
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeGoals90,
      awayGoals90,
      winnerTeamId,
      manualOverride: true,
      ...(finished ? { status: "FINISHED" } : {}),
    },
  });
  revalidateAll(matchId);
  return { ok: true };
}

/** Clears the manual override so the next sync manages this match again. */
export async function adminClearOverride(formData: FormData): Promise<ActionResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const matchId = z.coerce.number().int().safeParse(formData.get("matchId"));
  if (!matchId.success) return { ok: false, error: "Invalid match." };

  await prisma.match.update({
    where: { id: matchId.data },
    data: { manualOverride: false },
  });
  revalidateAll(matchId.data);
  return { ok: true };
}
