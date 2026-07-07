import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { syncMatches } from "@/lib/sync";

/**
 * Score-sync endpoint. Two callers:
 * - the admin "Sync now" button (POST, session cookie), and
 * - a cron job on serverless deploys where the instrumentation poller
 *   doesn't run (GET, `Authorization: Bearer $CRON_SECRET` — the header
 *   Vercel Cron sends automatically when CRON_SECRET is set).
 */
function hasCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

async function runSync() {
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

export async function GET(req: Request) {
  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return runSync();
}

export async function POST(req: Request) {
  if (hasCronSecret(req)) return runSync();

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return runSync();
}
