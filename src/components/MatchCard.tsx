import Link from "next/link";
import { LocalTime } from "@/components/LocalTime";
import { LockCountdown } from "@/components/LockCountdown";
import { PredictionForm } from "@/components/PredictionForm";
import { TeamLabel } from "@/components/TeamLabel";
import { matchLockTime } from "@/lib/locks";
import { scorePrediction } from "@/lib/scoring";
import { stageLabel } from "@/lib/stages";

export interface MatchCardMatch {
  id: number;
  stage: string;
  group: string | null;
  kickoff: Date;
  status: string;
  duration: string | null;
  homeTeam: { name: string; crest: string | null; tla: string | null } | null;
  awayTeam: { name: string; crest: string | null; tla: string | null } | null;
  homeGoals90: number | null;
  awayGoals90: number | null;
}

export function MatchCard({
  match,
  prediction,
  locked,
}: {
  match: MatchCardMatch;
  prediction: { homeGoals: number; awayGoals: number } | null;
  locked: boolean;
}) {
  const finished = match.status === "FINISHED";
  const live = match.status === "IN_PLAY" || match.status === "PAUSED";
  const hasResult = match.homeGoals90 !== null && match.awayGoals90 !== null;
  const points =
    finished && hasResult && prediction
      ? scorePrediction(
          { home: prediction.homeGoals, away: prediction.awayGoals },
          { home: match.homeGoals90!, away: match.awayGoals90! },
        )
      : null;
  const editable = !locked && match.homeTeam !== null && match.awayTeam !== null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {stageLabel(match.stage)}
          {match.group ? ` · ${match.group.replace("GROUP_", "Group ")}` : ""}
        </span>
        <span>·</span>
        <LocalTime iso={match.kickoff.toISOString()} />
        {live && (
          <span className="rounded bg-red-600 px-1.5 py-0.5 font-semibold text-white">
            LIVE
          </span>
        )}
        {!locked && <LockCountdown lockIso={matchLockTime(match.kickoff).toISOString()} />}
        <Link
          href={`/matches/${match.id}`}
          className="ml-auto shrink-0 text-zinc-400 hover:text-zinc-600 hover:underline dark:hover:text-zinc-300"
        >
          All predictions →
        </Link>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamLabel team={match.homeTeam} align="right" />
        <div className="text-center font-mono text-lg font-semibold tabular-nums">
          {hasResult ? (
            <>
              {match.homeGoals90}–{match.awayGoals90}
              {match.duration && match.duration !== "REGULAR" && (
                <span
                  className="ml-1 align-middle text-[10px] font-normal text-zinc-400"
                  title="90-minute score; the match went beyond regular time"
                >
                  90&#8242;
                </span>
              )}
            </>
          ) : (
            <span className="text-zinc-300 dark:text-zinc-600">vs</span>
          )}
        </div>
        <TeamLabel team={match.awayTeam} />
      </div>

      <div className="mt-2 flex items-center justify-center gap-3 text-sm">
        {editable ? (
          <PredictionForm
            matchId={match.id}
            initialHome={prediction?.homeGoals ?? null}
            initialAway={prediction?.awayGoals ?? null}
          />
        ) : (
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            {prediction ? (
              <span>
                Your pick:{" "}
                <span className="font-mono font-medium text-zinc-700 dark:text-zinc-200">
                  {prediction.homeGoals}–{prediction.awayGoals}
                </span>
              </span>
            ) : match.homeTeam === null || match.awayTeam === null ? (
              <span>Teams not decided yet</span>
            ) : (
              <span>No prediction 🔒</span>
            )}
            {points !== null && (
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                  points === 3
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                    : points === 1
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                +{points} pt{points === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
