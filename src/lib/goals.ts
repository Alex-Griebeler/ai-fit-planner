export const GOAL_VALUES = [
  "weight_loss",
  "hypertrophy",
  "health",
  "performance",
] as const;
export const MAX_GOALS_ALLOWED = 2;

export type GoalValue = (typeof GOAL_VALUES)[number];

export function isGoalValue(value: string | null | undefined): value is GoalValue {
  if (!value) return false;
  return (GOAL_VALUES as readonly string[]).includes(value);
}

export function normalizeGoals(values: string[] | null | undefined): GoalValue[] {
  if (!Array.isArray(values)) return [];

  const deduped = new Set<GoalValue>();
  for (const value of values) {
    if (isGoalValue(value)) {
      deduped.add(value);
    }
  }
  return [...deduped];
}

export function goalsFromLegacy(
  goal: string | null | undefined,
  goals: string[] | null | undefined,
): GoalValue[] {
  const normalized = normalizeGoals(goals);
  if (normalized.length > 0) return normalized.slice(0, MAX_GOALS_ALLOWED);
  return isGoalValue(goal) ? [goal] : [];
}

export function primaryGoalFromGoals(goals: GoalValue[] | null | undefined): GoalValue | null {
  const normalized = normalizeGoals(goals ?? []);
  return normalized[0] ?? null;
}
