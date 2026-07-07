import { requireSession } from "@/auth";
import { ChampionForm } from "@/components/ChampionForm";
import { LocalTime } from "@/components/LocalTime";
import { LockCountdown } from "@/components/LockCountdown";
import { prisma } from "@/lib/db";
import { getChampionLockTime, isChampionPickLocked } from "@/lib/locks";
import { getAliveTeamIds, getChampionTeamId } from "@/lib/queries";
import { POINTS_CHAMPION } from "@/lib/scoring";

export default async function ChampionPage() {
  const session = await requireSession();

  const [teams, aliveIds, lockTime, locked, championTeamId, picks, myPick] =
    await Promise.all([
      prisma.team.findMany({ orderBy: { name: "asc" } }),
      getAliveTeamIds(),
      getChampionLockTime(),
      isChampionPickLocked(),
      getChampionTeamId(),
      prisma.championPick.findMany({
        include: {
          user: { select: { id: true, name: true, image: true } },
          team: { select: { name: true, crest: true } },
        },
        orderBy: { user: { name: "asc" } },
      }),
      prisma.championPick.findUnique({
        where: { userId: session.user.id },
        include: { team: { select: { name: true, crest: true } } },
      }),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Champion pick</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Predict who lifts the trophy — worth {POINTS_CHAMPION} points.{" "}
        {lockTime && !locked && (
          <>
            Locks 1 hour before the first quarter-final (
            <LocalTime iso={lockTime.toISOString()} />
            ). <LockCountdown lockIso={lockTime.toISOString()} />
          </>
        )}
        {locked && "Picks are locked."}
      </p>

      <div className="mt-5">
        {locked ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            {myPick ? (
              <span>
                Your pick: <span className="font-semibold">{myPick.team.name}</span>{" "}
                🔒
              </span>
            ) : (
              <span className="text-zinc-500 dark:text-zinc-400">
                You didn&apos;t make a pick before the deadline. 🔒
              </span>
            )}
          </div>
        ) : (
          <ChampionForm
            teams={teams.map((t) => ({
              id: t.id,
              name: t.name,
              alive: aliveIds.size === 0 || aliveIds.has(t.id),
            }))}
            initialTeamId={myPick?.teamId ?? null}
          />
        )}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Everyone&apos;s picks</h2>
      {picks.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No picks yet.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {picks.map((p) => {
            const hit = championTeamId !== null && p.teamId === championTeamId;
            return (
              <li
                key={p.userId}
                className="flex items-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
              >
                {p.user.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.user.image} alt="" className="h-5 w-5 rounded-full" />
                )}
                <span>
                  {p.user.name ?? "Anonymous"}
                  {p.user.id === session.user.id && (
                    <span className="ml-1 text-xs text-zinc-400">(you)</span>
                  )}
                </span>
                <span className="ml-auto flex items-center gap-2 font-medium">
                  {p.team.crest && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.team.crest}
                      alt=""
                      className="h-4 w-4 object-contain"
                    />
                  )}
                  {p.team.name}
                  {hit && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      🏆 +{POINTS_CHAMPION}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
