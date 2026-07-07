"use client";

import { useState, useTransition } from "react";
import { adminClearOverride, adminUpdateResult } from "@/app/actions/admin";

export interface AdminMatchProps {
  matchId: number;
  title: string;
  subtitle: string;
  status: string;
  homeGoals90: number | null;
  awayGoals90: number | null;
  winnerTeamId: number | null;
  manualOverride: boolean;
  isKnockout: boolean;
  teams: { id: number; name: string }[];
}

export function AdminMatchRow(props: AdminMatchProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: (fd: FormData) => Promise<{ ok: boolean; error?: string }>, form: HTMLFormElement) {
    const fd = new FormData(form);
    startTransition(async () => {
      const result = await action(fd);
      setMessage(result.ok ? "✓ saved" : (result.error ?? "failed"));
    });
  }

  const inputCls =
    "w-12 rounded border border-zinc-300 bg-white px-1 py-1 text-center text-sm dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0">
          <div className="font-medium">{props.title}</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {props.subtitle} · {props.status}
            {props.manualOverride && (
              <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                manual override
              </span>
            )}
          </div>
        </div>

        <form
          className="ml-auto flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(adminUpdateResult, e.currentTarget);
          }}
        >
          <input type="hidden" name="matchId" value={props.matchId} />
          <input
            type="number"
            name="homeGoals90"
            min={0}
            max={99}
            defaultValue={props.homeGoals90 ?? ""}
            required
            className={inputCls}
            aria-label="Home goals (90 min)"
          />
          <span className="text-zinc-400">–</span>
          <input
            type="number"
            name="awayGoals90"
            min={0}
            max={99}
            defaultValue={props.awayGoals90 ?? ""}
            required
            className={inputCls}
            aria-label="Away goals (90 min)"
          />
          {props.isKnockout ? (
            <select
              name="winnerTeamId"
              defaultValue={props.winnerTeamId ?? ""}
              className="rounded border border-zinc-300 bg-white px-1 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              aria-label="Advancing winner (incl. extra time/pens)"
              title="Advancing winner (incl. extra time/pens)"
            >
              <option value="">winner: undecided</option>
              {props.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  winner: {t.name}
                </option>
              ))}
            </select>
          ) : (
            <input type="hidden" name="winnerTeamId" value="" />
          )}
          <label className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <input
              type="checkbox"
              name="finished"
              defaultChecked={props.status === "FINISHED"}
            />
            finished
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-40 hover:bg-emerald-500"
          >
            Save
          </button>
        </form>

        {props.manualOverride && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(adminClearOverride, e.currentTarget);
            }}
          >
            <input type="hidden" name="matchId" value={props.matchId} />
            <button
              type="submit"
              disabled={pending}
              className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-40 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              title="Let the next sync manage this match again"
            >
              Clear override
            </button>
          </form>
        )}
        {message && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{message}</span>
        )}
      </div>
    </div>
  );
}
