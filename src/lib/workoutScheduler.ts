/**
 * Workout Scheduler - Lógica de agendamento e sugestão de treinos
 * 
 * Este módulo calcula qual treino o usuário deveria fazer com base em:
 * - Dias de treino selecionados no onboarding
 * - Histórico de sessões da semana atual
 * - Mapeamento treino ↔ dia da semana
 */

export type DayCode = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface ScheduledWorkout {
  workoutIndex: number;
  dayCode: DayCode;
  dayLabel: string;
  status: 'today' | 'pending' | 'upcoming' | 'completed';
  originalDayLabel?: string;
}

// Ordem dos dias na semana (domingo = 0)
const DAY_ORDER: DayCode[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const DAY_LABELS: Record<DayCode, string> = {
  sun: 'Domingo',
  mon: 'Segunda-feira',
  tue: 'Terça-feira',
  wed: 'Quarta-feira',
  thu: 'Quinta-feira',
  fri: 'Sexta-feira',
  sat: 'Sábado',
};

/**
 * Converte código do dia para label em português
 */
export function getDayLabel(dayCode: DayCode): string {
  return DAY_LABELS[dayCode] || dayCode;
}

/**
 * Retorna o código do dia atual
 */
export function getTodayDayCode(): DayCode {
  return DAY_ORDER[new Date().getDay()];
}

/**
 * Retorna o índice numérico do dia (0-6, domingo = 0)
 */
export function getDayIndex(dayCode: DayCode): number {
  return DAY_ORDER.indexOf(dayCode);
}

/**
 * Ordena os dias pela sequência da semana
 */
export function sortDaysByWeekOrder(days: string[]): DayCode[] {
  const validDays = days.filter((d): d is DayCode => DAY_ORDER.includes(d as DayCode));
  return validDays.sort((a, b) => getDayIndex(a) - getDayIndex(b));
}

/**
 * Retorna o início da semana atual (domingo às 00:00)
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
 * Verifica se uma data está na semana atual
 */
export function isInCurrentWeek(date: Date): boolean {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return date >= weekStart && date < weekEnd;
}

interface WorkoutSession {
  workout_day: string;
  workout_name: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

interface ScheduleResult {
  suggestedWorkoutIndex: number | null;
  todayWorkoutIndex: number | null;
  pendingWorkoutIndex: number | null;
  completedIndices: number[];
  isWeekComplete: boolean;
  isRestDay: boolean;
  reason: string;
}

/**
 * Calcula o cronograma semanal e identifica o próximo treino sugerido
 * 
 * @param totalWorkouts - Número total de treinos no plano
 * @param trainingDays - Dias selecionados no onboarding ('mon', 'tue', etc.)
 * @param sessions - Sessões de treino completadas na semana
 * @returns Informações sobre qual treino sugerir
 */
export function getWeeklySchedule(
  totalWorkouts: number,
  trainingDays: string[],
  sessions: WorkoutSession[]
): ScheduleResult {
  const sortedDays = sortDaysByWeekOrder(trainingDays);
  const todayCode = getTodayDayCode();
  const todayIndex = getDayIndex(todayCode);
  
  // Filtra sessões completadas na semana atual
  const weekStart = getWeekStart();
  const completedThisWeek = sessions.filter(s => {
    if (s.status !== 'completed') return false;
    const sessionDate = new Date(s.completed_at || s.created_at);
    return isInCurrentWeek(sessionDate);
  });
  
  // Mapear treinos para dias (índice do treino → código do dia)
  const workoutToDayMap: Map<number, DayCode> = new Map();
  sortedDays.forEach((day, idx) => {
    if (idx < totalWorkouts) {
      workoutToDayMap.set(idx, day);
    }
  });
  
  // Identificar quais treinos já foram completados
  // Usamos o índice do treino no plano baseado no workout_day
  const completedIndices: number[] = [];
  completedThisWeek.forEach(session => {
    // Encontrar o índice do treino pelo dia
    const dayCode = session.workout_day.toLowerCase() as DayCode;
    for (const [idx, mappedDay] of workoutToDayMap.entries()) {
      if (mappedDay === dayCode && !completedIndices.includes(idx)) {
        completedIndices.push(idx);
        break;
      }
    }
  });
  
  // Verificar se semana está completa
  const isWeekComplete = completedIndices.length >= Math.min(totalWorkouts, sortedDays.length);
  
  if (isWeekComplete) {
    return {
      suggestedWorkoutIndex: null,
      todayWorkoutIndex: null,
      pendingWorkoutIndex: null,
      completedIndices,
      isWeekComplete: true,
      isRestDay: false,
      reason: 'Semana completa! Todos os treinos foram realizados.',
    };
  }
  
  // Verificar se hoje é dia de treino
  const isTodayTrainingDay = sortedDays.includes(todayCode);
  
  // Encontrar o treino de hoje (se for dia de treino)
  let todayWorkoutIndex: number | null = null;
  if (isTodayTrainingDay) {
    for (const [idx, day] of workoutToDayMap.entries()) {
      if (day === todayCode && !completedIndices.includes(idx)) {
        todayWorkoutIndex = idx;
        break;
      }
    }
  }
  
  // Encontrar treino pendente (dia anterior não completado)
  let pendingWorkoutIndex: number | null = null;
  for (const [idx, day] of workoutToDayMap.entries()) {
    const dayIdx = getDayIndex(day);
    // Dia já passou e treino não foi completado
    if (dayIdx < todayIndex && !completedIndices.includes(idx)) {
      pendingWorkoutIndex = idx;
      break;
    }
  }
  
  // Determinar treino sugerido (prioridade: pendente > hoje > próximo)
  let suggestedWorkoutIndex: number | null = pendingWorkoutIndex ?? todayWorkoutIndex;
  let reason = '';
  
  if (pendingWorkoutIndex !== null) {
    const pendingDay = workoutToDayMap.get(pendingWorkoutIndex);
    reason = `Treino de ${getDayLabel(pendingDay!)} ainda não realizado.`;
  } else if (todayWorkoutIndex !== null) {
    reason = 'Hoje é dia de treino!';
  } else {
    // Encontrar próximo treino da semana
    for (const [idx, day] of workoutToDayMap.entries()) {
      const dayIdx = getDayIndex(day);
      if (dayIdx > todayIndex && !completedIndices.includes(idx)) {
        suggestedWorkoutIndex = idx;
        reason = `Próximo treino: ${getDayLabel(day)}.`;
        break;
      }
    }
  }
  
  // Verificar se é dia de descanso
  const isRestDay = !isTodayTrainingDay && pendingWorkoutIndex === null;
  
  if (isRestDay && suggestedWorkoutIndex !== null) {
    const nextDay = workoutToDayMap.get(suggestedWorkoutIndex);
    reason = `Dia de descanso. Próximo treino: ${getDayLabel(nextDay!)}.`;
  }
  
  return {
    suggestedWorkoutIndex,
    todayWorkoutIndex,
    pendingWorkoutIndex,
    completedIndices,
    isWeekComplete,
    isRestDay,
    reason,
  };
}

/**
 * Reordena a lista de treinos colocando o sugerido no topo
 * 
 * @param workoutIndices - Índices originais dos treinos [0, 1, 2, ...]
 * @param suggestedIndex - Índice do treino sugerido
 * @returns Nova ordem dos índices
 */
export function reorderWorkoutsWithSuggestion(
  workoutIndices: number[],
  suggestedIndex: number | null
): number[] {
  if (suggestedIndex === null || !workoutIndices.includes(suggestedIndex)) {
    return workoutIndices;
  }
  
  // Remove o sugerido da posição atual e coloca no topo
  const filtered = workoutIndices.filter(i => i !== suggestedIndex);
  return [suggestedIndex, ...filtered];
}
