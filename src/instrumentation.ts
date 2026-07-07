const globalState = globalThis as unknown as { __wcSyncPollerStarted?: boolean };

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Dev hot-reload can call register() repeatedly — start the poller once.
  if (globalState.__wcSyncPollerStarted) return;
  globalState.__wcSyncPollerStarted = true;

  const { syncMatches } = await import("@/lib/sync");
  const intervalMs = Number(process.env.SYNC_INTERVAL_MS) || 5 * 60 * 1000;

  let inFlight = false;
  const run = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const { teams, matches } = await syncMatches();
      console.log(`[sync] ok: ${matches} matches, ${teams} teams`);
    } catch (err) {
      console.error("[sync] failed:", err instanceof Error ? err.message : err);
    } finally {
      inFlight = false;
    }
  };

  // Fire-and-forget so server startup isn't blocked on the API call.
  void run();
  setInterval(run, intervalMs);
  console.log(`[sync] poller started (every ${Math.round(intervalMs / 1000)}s)`);
}
