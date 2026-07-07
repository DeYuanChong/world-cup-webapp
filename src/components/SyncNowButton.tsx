"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SyncNowButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function sync() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/sync", { method: "POST" });
        const data = await res.json();
        setMessage(
          data.ok
            ? `Synced ${data.matches} matches, ${data.teams} teams.`
            : `Sync failed: ${data.error}`,
        );
        if (data.ok) router.refresh();
      } catch {
        setMessage("Sync failed: network error.");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={sync}
        disabled={pending}
        className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Syncing…" : "Sync now"}
      </button>
      {message && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{message}</span>
      )}
    </div>
  );
}
