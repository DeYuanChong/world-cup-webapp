"use client";

import { useState, useTransition } from "react";
import { saveChampionPick } from "@/app/actions/champion";

export interface TeamOption {
  id: number;
  name: string;
  alive: boolean;
}

export function ChampionForm({
  teams,
  initialTeamId,
}: {
  teams: TeamOption[];
  initialTeamId: number | null;
}) {
  const [teamId, setTeamId] = useState(initialTeamId?.toString() ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const dirty = teamId !== (initialTeamId?.toString() ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) return;
    startTransition(async () => {
      const result = await saveChampionPick({ teamId: Number(teamId) });
      if (result.ok) {
        setStatus("saved");
      } else {
        setStatus("error");
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <select
        value={teamId}
        onChange={(e) => {
          setTeamId(e.target.value);
          setStatus("idle");
        }}
        className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        aria-label="Champion pick"
      >
        <option value="">Pick a team…</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id} disabled={!t.alive}>
            {t.name}
            {!t.alive ? " (eliminated)" : ""}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || !teamId || !dirty}
        className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 hover:bg-emerald-500"
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
