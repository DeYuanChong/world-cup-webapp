import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { syncMatches } from "@/lib/sync";

// Admin "Sync now" target; also the endpoint a cron job would hit on a
// serverless deploy where the instrumentation poller doesn't run.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const result = await syncMatches();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "sync failed" },
      { status: 502 },
    );
  }
}
