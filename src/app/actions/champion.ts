"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isChampionPickLocked } from "@/lib/locks";
import type { ActionResult } from "@/app/actions/predictions";

export async function saveChampionPick(input: {
  teamId: number;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not signed in." };

  const parsed = z.object({ teamId: z.number().int() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid team." };
  const { teamId } = parsed.data;

  // Authoritative lock check — 1 hour before the first quarter-final.
  if (await isChampionPickLocked()) {
    return { ok: false, error: "Champion picks are locked." };
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { ok: false, error: "Unknown team." };

  await prisma.championPick.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, teamId },
    update: { teamId },
  });

  revalidatePath("/champion");
  return { ok: true };
}
