"use client";

import { useState, useTransition } from "react";
import { savePrediction } from "@/app/actions/predictions";

export function PredictionForm({
  matchId,
  initialHome,
  initialAway,
}: {
  matchId: number;
  initialHome: number | null;
  initialAway: number | null;
}) {
  const [home, setHome] = useState(initialHome?.toString() ?? "");
  const [away, setAway] = useState(initialAway?.toString() ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const dirty =
    home !== (initialHome?.toString() ?? "") ||
    away !== (initialAway?.toString() ?? "");
  const complete = home !== "" && away !== "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return;
    startTransition(async () => {
      const result = await savePrediction({
        matchId,
        homeGoals: Number(home),
        awayGoals: Number(away),
      });
      if (result.ok) {
        setStatus("saved");
      } else {
        setStatus("error");
        setError(result.error);
      }
    });
  }

  const inputCls =
    "w-12 rounded border border-zinc-300 bg-white px-1 py-1 text-center text-sm dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={99}
        value={home}
        onChange={(e) => {
          setHome(e.target.value);
          setStatus("idle");
        }}
        className={inputCls}
        aria-label="Home goals"
      />
      <span className="text-zinc-400">–</span>
      <input
        type="number"
        min={0}
        max={99}
        value={away}
        onChange={(e) => {
          setAway(e.target.value);
          setStatus("idle");
        }}
        className={inputCls}
        aria-label="Away goals"
      />
      <button
        type="submit"
        disabled={pending || !complete || !dirty}
        className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-40 hover:bg-emerald-500"
      >
        {pending ? "…" : "Save"}
      </button>
      {status === "saved" && !dirty && (
        <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ saved</span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </form>
  );
}
