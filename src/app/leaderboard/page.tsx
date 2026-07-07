import { requireSession } from "@/auth";
import { getLeaderboard } from "@/lib/queries";

export default async function LeaderboardPage() {
  const session = await requireSession();
  const rows = await getLeaderboard();

  return (
    <div>
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Exact score 3 pts · correct outcome 1 pt · champion 5 pts. Ties are
        broken by exact-score count.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
          Nobody has signed up yet.
        </p>
      ) : (
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="py-2 pr-2">#</th>
              <th className="py-2">Player</th>
              <th className="py-2 text-right">Exact</th>
              <th className="py-2 text-right">Outcome</th>
              <th className="py-2 text-right">🏆</th>
              <th className="py-2 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.userId}
                className={`border-b border-zinc-100 dark:border-zinc-900 ${
                  r.userId === session.user.id
                    ? "bg-emerald-50 dark:bg-emerald-950/40"
                    : ""
                }`}
              >
                <td className="py-2 pr-2 font-semibold tabular-nums">
                  {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                </td>
                <td className="flex items-center gap-2 py-2">
                  {r.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image} alt="" className="h-5 w-5 rounded-full" />
                  )}
                  {r.name ?? "Anonymous"}
                  {r.userId === session.user.id && (
                    <span className="text-xs text-zinc-400">(you)</span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">{r.exactCount}</td>
                <td className="py-2 text-right tabular-nums">{r.outcomeCount}</td>
                <td className="py-2 text-right">{r.championHit ? "✓" : ""}</td>
                <td className="py-2 text-right font-bold tabular-nums">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
