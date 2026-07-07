import { requireSession } from "@/auth";
import { MatchCard, type MatchCardMatch } from "@/components/MatchCard";
import { prisma } from "@/lib/db";
import { isMatchLocked } from "@/lib/locks";

const teamSelect = { select: { name: true, crest: true, tla: true } };

export default async function FixturesPage() {
  const session = await requireSession();

  const [matches, allPredictions] = await Promise.all([
    prisma.match.findMany({
      orderBy: { kickoff: "asc" },
      select: {
        id: true,
        stage: true,
        group: true,
        kickoff: true,
        status: true,
        duration: true,
        homeGoals90: true,
        awayGoals90: true,
        homeTeam: teamSelect,
        awayTeam: teamSelect,
      },
    }),
    prisma.prediction.findMany({
      select: {
        matchId: true,
        homeGoals: true,
        awayGoals: true,
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  if (matches.length === 0) {
    return (
      <div className="py-16 text-center text-zinc-500 dark:text-zinc-400">
        <p className="text-lg">No fixtures yet.</p>
        <p className="mt-2 text-sm">
          The first score sync hasn&apos;t run — check that{" "}
          <code>FOOTBALL_DATA_API_KEY</code> is set in <code>.env</code> and watch
          the server logs for <code>[sync]</code> messages.
        </p>
      </div>
    );
  }

  const predsByMatch = new Map<number, typeof allPredictions>();
  for (const p of allPredictions) {
    // Own prediction first, then the rest in name order.
    if (p.user.id === session.user.id) {
      predsByMatch.set(p.matchId, [p, ...(predsByMatch.get(p.matchId) ?? [])]);
    } else {
      predsByMatch.set(p.matchId, [...(predsByMatch.get(p.matchId) ?? []), p]);
    }
  }
  const myPredByMatch = new Map(
    allPredictions
      .filter((p) => p.user.id === session.user.id)
      .map((p) => [p.matchId, p]),
  );
  const live = matches.filter((m) => m.status === "IN_PLAY" || m.status === "PAUSED");
  const upcoming = matches.filter(
    (m) => m.status !== "FINISHED" && m.status !== "IN_PLAY" && m.status !== "PAUSED",
  );
  const finished = matches.filter((m) => m.status === "FINISHED").reverse();

  const section = (title: string, list: typeof matches) =>
    list.length > 0 && (
      <section key={title}>
        <h2 className="mb-3 mt-8 text-lg font-bold first:mt-0">{title}</h2>
        <div className="flex flex-col gap-3">
          {list.map((m) => (
            <MatchCard
              key={m.id}
              match={m as MatchCardMatch}
              prediction={myPredByMatch.get(m.id) ?? null}
              locked={isMatchLocked(m.kickoff)}
              predictions={predsByMatch.get(m.id) ?? []}
              currentUserId={session.user.id}
            />
          ))}
        </div>
      </section>
    );

  return (
    <div>
      {section("Live", live)}
      {section("Upcoming", upcoming)}
      {section("Finished", finished)}
    </div>
  );
}
