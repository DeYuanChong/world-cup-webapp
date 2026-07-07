import Link from "next/link";
import type { Session } from "next-auth";
import { signOut } from "@/auth";
import { isAdmin } from "@/lib/admin";

export function Nav({ session }: { session: Session | null }) {
  const admin = isAdmin(session?.user?.email);
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-3">
        <Link href="/" className="font-bold tracking-tight">
          ⚽ WC2026
        </Link>
        {session && (
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/" className="hover:underline">
              Fixtures
            </Link>
            <Link href="/champion" className="hover:underline">
              Champion
            </Link>
            <Link href="/leaderboard" className="hover:underline">
              Leaderboard
            </Link>
            {admin && (
              <Link href="/admin" className="hover:underline">
                Admin
              </Link>
            )}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2 text-sm">
          {session?.user ? (
            <>
              {session.user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt=""
                  className="h-6 w-6 rounded-full"
                />
              )}
              <span className="hidden sm:inline text-zinc-500 dark:text-zinc-400">
                {session.user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/signin" });
                }}
              >
                <button className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/signin" className="hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
