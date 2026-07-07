import { notFound } from "next/navigation";
import { requireSession } from "@/auth";
import { AdminMatchRow } from "@/components/AdminMatchRow";
import { LocalTime } from "@/components/LocalTime";
import { SyncNowButton } from "@/components/SyncNowButton";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { stageLabel } from "@/lib/stages";

export default async function AdminPage() {
  const session = await requireSession();
  if (!isAdmin(session.user.email)) notFound();

  const [matches, syncState] = await Promise.all([
    prisma.match.findMany({
      orderBy: { kickoff: "desc" },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
      },
    }),
    prisma.syncState.findUnique({ where: { id: 1 } }),
  ]);
  const lastSyncedAt = syncState?.lastSyncedAt ?? null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <SyncNowButton />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {lastSyncedAt ? (
            <>
              Last sync: <LocalTime iso={lastSyncedAt.toISOString()} />
            </>
          ) : (
            "Never synced."
          )}
        </span>
      </div>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Scores are the <strong>90-minute</strong> result (never extra time or
        penalties). Saving a score sets a manual override so the sync won&apos;t
        overwrite it. The winner field (knockouts) is the advancing team incl.
        extra time/pens — it decides the champion pick on the Final.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {matches.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No matches yet — run a sync.
          </p>
        )}
        {matches.map((m) => (
          <AdminMatchRow
            key={m.id}
            matchId={m.id}
            title={`${m.homeTeam?.name ?? "TBD"} vs ${m.awayTeam?.name ?? "TBD"}`}
            subtitle={`${stageLabel(m.stage)} · ${m.kickoff.toISOString().slice(0, 16).replace("T", " ")} UTC`}
            status={m.status}
            homeGoals90={m.homeGoals90}
            awayGoals90={m.awayGoals90}
            winnerTeamId={m.winnerTeamId}
            manualOverride={m.manualOverride}
            isKnockout={m.stage !== "GROUP_STAGE"}
            teams={[m.homeTeam, m.awayTeam].filter((t): t is NonNullable<typeof t> => t !== null)}
          />
        ))}
      </div>
    </div>
  );
}
