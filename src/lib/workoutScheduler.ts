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

interface WorkoutExercise {
  name: string;
  equipment?: string;
  muscleGroup?: string;
}

/**
 * Extrai os grupos musculares dos exercícios do treino na ordem de prescrição
 * Prioriza o campo muscleGroup do exercício, com fallback para inferência por nome
 */
export function inferMuscleGroupsFromExercises(exercises: WorkoutExercise[]): string[] {
  const groupsSet = new Set<string>();
  
  // Mapeamento para traduzir grupos em inglês para português
  const translations: Record<string, string> = {
    'chest': 'Peitoral',
    'back': 'Costas',
    'shoulders': 'Ombros',
    'biceps': 'Bíceps',
    'triceps': 'Tríceps',
    'quadriceps': 'Quadríceps',
    'quads': 'Quadríceps',
    'hamstrings': 'Posteriores',
    'glutes': 'Glúteos',
    'calves': 'Panturrilhas',
    'core': 'Core',
    'abs': 'Core',
  };
  
  const translateGroup = (group: string): string => {
    const lower = group.toLowerCase().trim();
    return translations[lower] || group;
  };
  
  exercises.forEach(exercise => {
    // PRIORIDADE 1: Usa o muscleGroup definido no exercício (mais preciso)
    if (exercise.muscleGroup) {
      const translated = translateGroup(exercise.muscleGroup);
      groupsSet.add(translated);
      return; // Pula a inferência se já tem muscleGroup
    }
    
    // PRIORIDADE 2: Inferência por nome do exercício (fallback)
    const name = exercise.name.toLowerCase();
    
    // Costas
    if (name.includes('remada') || name.includes('puxada') || name.includes('pulldown') || 
        name.includes('pull-up') || name.includes('barra fixa') || name.includes('pull up') ||
        name.includes('serrote') || name.includes('row') || name.includes('lat ') ||
        name.includes('dorsal') || name.includes('trapézio') || name.includes('trap')) {
      groupsSet.add('Costas');
    }
    
    // Peitoral
    else if ((name.includes('supino') || (name.includes('press') && !name.includes('leg press'))) ||
        name.includes('flexão') || name.includes('peck') || name.includes('fly') ||
        name.includes('crucifixo') || name.includes('peito') || name.includes('chest') ||
        name.includes('voador')) {
      groupsSet.add('Peitoral');
    }
    
    // Ombros
    else if (name.includes('desenvolvimento') || name.includes('desenv') || name.includes('elevação lateral') ||
        name.includes('elevação frontal') || name.includes('ombro') || name.includes('shoulder') ||
        name.includes('deltóide') || name.includes('militar') || name.includes('arnold') ||
        name.includes('abdução dos ombros')) {
      groupsSet.add('Ombros');
    }
    
    // Bíceps
    else if ((name.includes('rosca') && !name.includes('rosca punho')) ||
        name.includes('biceps') || name.includes('bíceps') || name.includes('curl') ||
        name.includes('scott') || name.includes('martelo')) {
      groupsSet.add('Bíceps');
    }
    
    // Tríceps
    else if (name.includes('tríceps') || name.includes('triceps') || name.includes('paralela') ||
        name.includes('testa') || name.includes('francês') || name.includes('francesa') || name.includes('pushdown') ||
        name.includes('extensão de tríceps') || name.includes('coice')) {
      groupsSet.add('Tríceps');
    }
    
    // Quadríceps
    else if (name.includes('agachamento') || name.includes('leg press') || name.includes('extensora') ||
        name.includes('hack') || name.includes('squat') || name.includes('avanço') ||
        name.includes('passada') || name.includes('búlgaro') || name.includes('afundo')) {
      groupsSet.add('Quadríceps');
    }
    
    // Posteriores (Hamstrings)
    else if (name.includes('flexora') || name.includes('stiff') || name.includes('romeno') ||
        name.includes('hamstring') || name.includes('posterior') || name.includes('leg curl') ||
        name.includes('mesa flexora')) {
      groupsSet.add('Posteriores');
    }
    
    // Glúteos
    else if (name.includes('glúteo') || name.includes('gluteo') || name.includes('hip thrust') ||
        name.includes('elevação pélvica') || name.includes('elevação pelvica') || name.includes('abdução') ||
        name.includes('glute')) {
      groupsSet.add('Glúteos');
    }
    
    // Panturrilhas
    else if (name.includes('panturrilha') || name.includes('gêmeos') || name.includes('calf') ||
        name.includes('sóleo') || name.includes('elevação de calcanhar') || name.includes('flex. plantar')) {
      groupsSet.add('Panturrilhas');
    }
    
    // Core
    else if (name.includes('abdominal') || name.includes('abd.') || name.includes('prancha') || name.includes('crunch') ||
        name.includes('oblíquo') || name.includes('plank') || name.includes('core') ||
        name.includes('lombar') || name.includes('hiperextensão') || name.includes('reto abdominal')) {
      groupsSet.add('Core');
    }
    
    // Cintura Escapular
    else if (name.includes('face pull') || name.includes('rotação externa') ||
        name.includes('encolhimento') || name.includes('shrug') || name.includes('escapular') ||
        name.includes('manguito') || name.includes('crucifixo inverso')) {
      groupsSet.add('Cintura Escapular');
    }
  });
  
  // Retorna na ordem em que aparecem nos exercícios (preserva ordem de inserção do Set)
  return Array.from(groupsSet);
}
