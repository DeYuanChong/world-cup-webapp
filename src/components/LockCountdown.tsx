"use client";

import { useEffect, useState } from "react";

function remaining(lockIso: string): string | null {
  const ms = new Date(lockIso).getTime() - Date.now();
  if (ms <= 0) return null;
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Cosmetic countdown to a lock time; the server enforces the actual lock. */
export function LockCountdown({ lockIso }: { lockIso: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setText(remaining(lockIso));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [lockIso]);
  if (text === null) return null;
  return (
    <span className="text-xs text-amber-600 dark:text-amber-400">
      locks in {text}
    </span>
  );
}
