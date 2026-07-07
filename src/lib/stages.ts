export const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: "Group Stage",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals",
  SEMI_FINALS: "Semi-finals",
  THIRD_PLACE: "Third Place",
  FINAL: "Final",
};

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage.replaceAll("_", " ").toLowerCase();
}
