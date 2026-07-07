import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="text-3xl font-bold">World Cup 2026 Predictions</h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Predict the full-time score of every match, pick the champion, and
        climb the leaderboard. Predictions lock one hour before kickoff.
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
          Sign in with Google
        </button>
      </form>
    </div>
  );
}
