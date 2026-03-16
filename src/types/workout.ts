/**
 * Shared workout domain types used across hooks, pages and components.
 * Single source of truth for workout plan data structures.
 */

export interface WorkoutExercise {
  order: number;
  name: string;
  equipment: string;
  sets: number;
  reps: string;
  rest: string;
  intensity?: string;
  tempo?: string;
  notes?: string;
  isCompound?: boolean;
  method?: string;
  muscleGroup?: string;
}

export interface WorkoutCardio {
  type: string;
  duration: string;
  intensity?: string;
  description?: string;
  notes?: string;
}

export interface WorkoutDay {
  day: string;
  name: string;
  focus: string;
  muscleGroups: string[];
  estimatedDuration: string;
  exercises: WorkoutExercise[];
  cardio?: WorkoutCardio | null;
}

export interface ProgressionPlan {
  week1?: string;
  week2?: string;
  week3?: string;
  week4?: string;
  deloadWeek?: string;
}

/** The shape of plan_data stored as JSONB in workout_plans table */
export interface WorkoutPlanData {
  workouts: WorkoutDay[];
  weeklyVolume: Record<string, number>;
  progressionPlan: string | ProgressionPlan;
  warnings: string[];
  motivationalMessage: string;
}

/** Full plan as returned by the generate-workout Edge Function */
export interface GeneratedWorkoutPlan extends WorkoutPlanData {
  planName: string;
  description: string;
  weeklyFrequency: number;
  sessionDuration: string;
  periodization: string;
}

/**
 * Type guard to validate that a value conforms to WorkoutPlanData shape.
 * Used when reading plan_data from the database (stored as Json).
 */
export function isWorkoutPlanData(value: unknown): value is WorkoutPlanData {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    Array.isArray(obj.workouts) &&
    obj.workouts.length > 0 &&
    typeof obj.workouts[0] === 'object'
  );
}

/**
 * Type guard for the generate-workout Edge Function response.
 */
export function isGeneratedPlan(value: unknown): value is GeneratedWorkoutPlan {
  if (!isWorkoutPlanData(value)) return false;
  // value already passed the object check in isWorkoutPlanData, safe to access properties
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.planName === 'string' &&
    typeof obj.weeklyFrequency === 'number'
  );
}
