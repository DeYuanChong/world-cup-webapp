import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/auth";
import { MatchCard, type MatchCardMatch } from "@/components/MatchCard";
import { prisma } from "@/lib/db";
import { isMatchLocked } from "@/lib/locks";
import { scorePrediction } from "@/lib/scoring";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: { select: { name: true, crest: true, tla: true } },
      awayTeam: { select: { name: true, crest: true, tla: true } },
      predictions: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
  });
  if (!match) notFound();

  const myPrediction =
    match.predictions.find((p) => p.user.id === session.user.id) ?? null;
  const finished = match.status === "FINISHED";
  const hasResult = match.homeGoals90 !== null && match.awayGoals90 !== null;

  return (
    <div>
      <Link
        href="/"
        className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        ← Fixtures
      </Link>
      <div className="mt-3">
        <MatchCard
          match={match as MatchCardMatch}
          prediction={myPrediction}
          locked={isMatchLocked(match.kickoff)}
          predictions={match.predictions}
          currentUserId={session.user.id}
        />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Everyone&apos;s predictions</h2>
      {match.predictions.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No predictions for this match yet.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="py-2">Player</th>
              <th className="py-2 text-center">Prediction</th>
              {finished && hasResult && <th className="py-2 text-right">Points</th>}
            </tr>
          </thead>
          <tbody>
            {match.predictions.map((p) => {
              const pts =
                finished && hasResult
                  ? scorePrediction(
                      { home: p.homeGoals, away: p.awayGoals },
                      { home: match.homeGoals90!, away: match.awayGoals90! },
                    )
                  : null;
              return (
                <tr
                  key={p.id}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="flex items-center gap-2 py-2">
                    {p.user.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.user.image}
                        alt=""
                        className="h-5 w-5 rounded-full"
                      />
                    )}
                    {p.user.name ?? "Anonymous"}
                    {p.user.id === session.user.id && (
                      <span className="text-xs text-zinc-400">(you)</span>
                    )}
                  </td>
                  <td className="py-2 text-center font-mono tabular-nums">
                    {p.homeGoals}–{p.awayGoals}
                  </td>
                  {pts !== null && (
                    <td className="py-2 text-right font-semibold">+{pts}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
