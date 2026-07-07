"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Renders a kickoff time in the viewer's locale/timezone. The server snapshot
 * is null (UTC fallback text), so server-rendered HTML never mismatches the
 * client's timezone-dependent formatting.
 */
export function LocalTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso)),
    () => null,
  );
  return <time dateTime={iso}>{text ?? iso.slice(0, 16).replace("T", " ") + " UTC"}</time>;
}
