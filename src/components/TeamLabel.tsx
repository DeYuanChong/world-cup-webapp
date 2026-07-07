interface TeamInfo {
  name: string;
  crest: string | null;
  tla: string | null;
}

export function TeamLabel({
  team,
  align = "left",
}: {
  team: TeamInfo | null;
  align?: "left" | "right";
}) {
  const dir = align === "right" ? "flex-row-reverse text-right" : "";
  if (!team) {
    return (
      <span className={`flex items-center gap-2 text-zinc-400 ${dir}`}>
        <span className="inline-block h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        TBD
      </span>
    );
  }
  return (
    <span className={`flex min-w-0 items-center gap-2 ${dir}`}>
      {team.crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.crest} alt="" className="h-5 w-5 shrink-0 object-contain" />
      ) : (
        <span className="inline-block h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      )}
      <span className="truncate" title={team.name}>
        <span className="sm:hidden">{team.tla ?? team.name}</span>
        <span className="hidden sm:inline">{team.name}</span>
      </span>
    </span>
  );
}
