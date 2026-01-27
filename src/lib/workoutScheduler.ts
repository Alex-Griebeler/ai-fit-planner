// Workout Scheduler Utilities
// Handles workout scheduling logic based on onboarding days and session history

export interface Workout {
  day: string;
  name: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    rest: string;
    notes?: string;
  }>;
}

export interface ScheduledWorkout {
  workout: Workout;
  dayCode: string;           // 'mon', 'tue', etc.
  dayLabel: string;          // 'Segunda-feira'
  status: 'today' | 'pending' | 'upcoming' | 'completed';
  originalDayLabel?: string; // For pending workouts (e.g., "era pra Segunda")
}

// Day code to label mapping
const DAY_LABELS: Record<string, string> = {
  sun: 'Domingo',
  mon: 'Segunda-feira',
  tue: 'Terça-feira',
  wed: 'Quarta-feira',
  thu: 'Quinta-feira',
  fri: 'Sexta-feira',
  sat: 'Sábado',
};

// Day code to week order (Sunday = 0)
const DAY_ORDER: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/**
 * Convert day code to full label
 */
export function getDayLabel(dayCode: string): string {
  return DAY_LABELS[dayCode] || dayCode;
}

/**
 * Get short day label (e.g., "Seg", "Ter")
 */
export function getShortDayLabel(dayCode: string): string {
  const shortLabels: Record<string, string> = {
    sun: 'Dom',
    mon: 'Seg',
    tue: 'Ter',
    wed: 'Qua',
    thu: 'Qui',
    fri: 'Sex',
    sat: 'Sáb',
  };
  return shortLabels[dayCode] || dayCode;
}

/**
 * Sort day codes by week order (starting from Sunday)
 */
export function sortDaysByWeekOrder(days: string[]): string[] {
  return [...days].sort((a, b) => (DAY_ORDER[a] ?? 99) - (DAY_ORDER[b] ?? 99));
}

/**
 * Get today's day code
 */
export function getTodayDayCode(): string {
  const dayCodes = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return dayCodes[new Date().getDay()];
}

/**
 * Get the start of the current week (Sunday)
 */
export function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get date for a specific day code in the current week
 */
export function getDateForDayCode(dayCode: string): Date {
  const weekStart = getWeekStart();
  const dayOffset = DAY_ORDER[dayCode] ?? 0;
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + dayOffset);
  return date;
}

/**
 * Check if a date is in the current week
 */
export function isInCurrentWeek(date: Date): boolean {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return date >= weekStart && date < weekEnd;
}

/**
 * Check if a session was completed for a specific workout day in current week
 */
export function wasWorkoutCompletedThisWeek(
  workoutDayName: string,
  sessions: Array<{ workout_day: string; status: string; created_at: string }>
): boolean {
  const weekStart = getWeekStart();
  
  return sessions.some(session => {
    const sessionDate = new Date(session.created_at);
    return (
      session.workout_day === workoutDayName &&
      session.status === 'completed' &&
      sessionDate >= weekStart
    );
  });
}

/**
 * Get skipped workouts from localStorage for current week
 */
export function getSkippedWorkouts(): string[] {
  const weekKey = `skipped_workouts_${getWeekStart().toISOString().split('T')[0]}`;
  const stored = localStorage.getItem(weekKey);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Mark a workout as skipped for current week
 */
export function skipWorkout(workoutDayName: string): void {
  const weekKey = `skipped_workouts_${getWeekStart().toISOString().split('T')[0]}`;
  const skipped = getSkippedWorkouts();
  if (!skipped.includes(workoutDayName)) {
    skipped.push(workoutDayName);
    localStorage.setItem(weekKey, JSON.stringify(skipped));
  }
}

/**
 * Clear old skipped workouts from localStorage
 */
export function clearOldSkippedWorkouts(): void {
  const currentWeekKey = `skipped_workouts_${getWeekStart().toISOString().split('T')[0]}`;
  
  // Remove old week keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('skipped_workouts_') && key !== currentWeekKey) {
      localStorage.removeItem(key);
    }
  }
}

export interface WorkoutScheduleResult {
  todayWorkout: ScheduledWorkout | null;
  missedWorkout: ScheduledWorkout | null;
  nextWorkout: ScheduledWorkout | null;
  isWeekComplete: boolean;
  isRestDay: boolean;
  completedCount: number;
  totalWorkouts: number;
}

/**
 * Calculate the weekly workout schedule
 * Maps workouts to training days and determines status based on sessions
 */
export function getWeeklySchedule(
  workouts: Workout[],
  trainingDays: string[],
  sessions: Array<{ workout_day: string; status: string; created_at: string }>
): WorkoutScheduleResult {
  // Clear old skipped workouts
  clearOldSkippedWorkouts();
  
  const todayCode = getTodayDayCode();
  const todayOrder = DAY_ORDER[todayCode];
  const skippedWorkouts = getSkippedWorkouts();
  
  // Sort training days by week order
  const sortedDays = sortDaysByWeekOrder(trainingDays);
  
  // Map workouts to days (in order)
  const scheduledWorkouts: ScheduledWorkout[] = workouts.slice(0, sortedDays.length).map((workout, index) => {
    const dayCode = sortedDays[index];
    const dayOrder = DAY_ORDER[dayCode];
    
    // Check if completed this week
    const isCompleted = wasWorkoutCompletedThisWeek(workout.day, sessions);
    
    // Check if skipped
    const isSkipped = skippedWorkouts.includes(workout.day);
    
    // Determine status
    let status: ScheduledWorkout['status'];
    if (isCompleted || isSkipped) {
      status = 'completed';
    } else if (dayOrder === todayOrder) {
      status = 'today';
    } else if (dayOrder < todayOrder) {
      status = 'pending';
    } else {
      status = 'upcoming';
    }
    
    return {
      workout,
      dayCode,
      dayLabel: getDayLabel(dayCode),
      status,
      originalDayLabel: status === 'pending' ? getDayLabel(dayCode) : undefined,
    };
  });
  
  // Find today's workout
  const todayWorkout = scheduledWorkouts.find(sw => sw.status === 'today') || null;
  
  // Find first pending (missed) workout
  const missedWorkout = scheduledWorkouts.find(sw => sw.status === 'pending') || null;
  
  // Find next upcoming workout
  const nextWorkout = scheduledWorkouts.find(sw => sw.status === 'upcoming') || null;
  
  // Count completed workouts
  const completedCount = scheduledWorkouts.filter(sw => sw.status === 'completed').length;
  const totalWorkouts = scheduledWorkouts.length;
  
  // Check if week is complete
  const isWeekComplete = completedCount >= totalWorkouts && totalWorkouts > 0;
  
  // Check if today is a rest day (not in training days and no pending workouts)
  const isRestDay = !trainingDays.includes(todayCode) && !missedWorkout;
  
  return {
    todayWorkout,
    missedWorkout,
    nextWorkout,
    isWeekComplete,
    isRestDay,
    completedCount,
    totalWorkouts,
  };
}
