import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// CORS configuration - restrict to trusted origins
const ALLOWED_ORIGINS = [
  Deno.env.get("SUPABASE_URL") || "",
  "http://localhost:5173",
  "http://localhost:8080",
  "https://lovable.dev",
  "https://www.lovable.dev",
].filter(Boolean);

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith(".lovable.dev") || origin.endsWith(".lovable.app") || origin.endsWith(".lovableproject.com")
  ) ? origin : ALLOWED_ORIGINS[0] || "";
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

// Input validation schema with injury areas
const OnboardingSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(50, "Nome deve ter no máximo 50 caracteres"),
  gender: z.enum(["female", "male", "other"]).nullable(),
  age: z.number().int().min(13, "Idade mínima é 13 anos").max(120, "Idade máxima é 120 anos").nullable(),
  height: z.number().int().min(100, "Altura mínima é 100 cm").max(250, "Altura máxima é 250 cm").nullable(),
  weight: z.number().int().min(30, "Peso mínimo é 30 kg").max(300, "Peso máximo é 300 kg").nullable(),
  goal: z.enum(["weight_loss", "hypertrophy", "health", "performance"]).nullable(),
  timeframe: z.enum(["3months", "6months", "12months"]).nullable(),
  trainingDays: z.array(z.string().max(20)).max(7),
  sessionDuration: z.enum(["30min", "45min", "60min", "60plus"]).nullable(),
  exerciseTypes: z.array(z.string().max(20)).max(5),
  includeCardio: z.boolean(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).nullable(),
  variationPreference: z.enum(["high", "moderate", "low"]).nullable(),
  bodyAreas: z.array(z.string().max(30)).max(10),
  hasHealthConditions: z.boolean(),
  injuryAreas: z.array(z.enum([
    "shoulder", "lower_back", "cervical", 
    "knee", "hip", "ankle_foot"
  ])).max(6).default([]),
  healthDescription: z.string().max(500, "Descrição de saúde deve ter no máximo 500 caracteres").optional().default(""),
  sleepHours: z.string().max(10).nullable(),
  stressLevel: z.enum(["low", "moderate", "high"]).nullable(),
});

type ValidatedUserData = z.infer<typeof OnboardingSchema>;

// Sanitize text for AI prompt to prevent injection
function sanitizeForPrompt(text: string, maxLength: number = 500): string {
  if (!text) return "";
  return text
    .replace(/ignore\s*(all\s*)?(previous|above|prior)\s*(instructions?)?/gi, "")
    .replace(/system\s*:/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

// Sanitize name for prompt - stricter validation for names
function sanitizeName(text: string): string {
  if (!text) return "";
  // Remove common prompt injection patterns
  let sanitized = text
    .replace(/ignore\s*(all\s*)?(previous|above|prior)\s*(instructions?)?/gi, "")
    .replace(/system\s*:/gi, "")
    .replace(/assistant\s*:/gi, "")
    .replace(/user\s*:/gi, "")
    .replace(/\[.*?\]/g, "") // Remove bracketed instructions
    .replace(/\{.*?\}/g, "") // Remove JSON-like patterns
    .replace(/\n/g, " ") // Remove newlines
    .trim()
    .slice(0, 50);
  
  // If the result looks suspicious (too short after sanitization), use generic
  if (sanitized.length < 2) {
    return "Usuário";
  }
  
  return sanitized;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                   NOVO SISTEMA DE CÁLCULO DE VOLUME (DOCUMENTO TÉCNICO)
// ═══════════════════════════════════════════════════════════════════════════════

interface VolumeRange {
  min: number;
  max: number;
}

interface VolumeRanges {
  large: VolumeRange;   // chest, back, quadriceps, hamstrings, glutes
  medium: VolumeRange;  // shoulders, scapular_belt (cintura escapular)
  small: VolumeRange;   // biceps, triceps, calves, core
}

interface CalculatedVolumeRanges extends VolumeRanges {
  setsPerWorkout: VolumeRange;
  recommendedSplit: string;
  factors: {
    frequency: string;
    goal: string;
    duration: string;
    level: number;
    recovery: number;
  };
}

// Tabela do documento técnico: Volume SEMANAL por FREQUÊNCIA
const FREQUENCY_VOLUME_RANGES: Record<string, VolumeRange> = {
  "1":   { min: 4, max: 10 },   // Full Body único (subótimo)
  "2":   { min: 4, max: 12 },   // Full Body A/B
  "3":   { min: 6, max: 15 },   // Full Body ou A/B
  "4":   { min: 8, max: 18 },   // Upper/Lower A/B
  "5":   { min: 10, max: 20 },  // Híbrido
  "6":   { min: 12, max: 20 },  // PPL 2x
  "7":   { min: 12, max: 20 },  // PPL 2x + Especialização
};

// Tabela do documento técnico: Volume SEMANAL por OBJETIVO
const GOAL_VOLUME_RANGES: Record<string, VolumeRange> = {
  "weight_loss": { min: 8, max: 20 },   // Emagrecimento: densidade alta
  "hypertrophy": { min: 10, max: 25 },  // Hipertrofia: volume máximo
  "health":      { min: 6, max: 14 },   // Saúde: volume moderado submáximo
  "performance": { min: 8, max: 18 },   // Performance: foco em intensidade
};

// Tabela do documento técnico: Séries POR TREINO conforme duração
// CORRIGIDO: 45min = 19-24, 60min = 25-30 conforme documento técnico
const SESSION_SETS_PER_WORKOUT: Record<string, VolumeRange> = {
  "30min":  { min: 12, max: 18 },
  "45min":  { min: 19, max: 24 },
  "60min":  { min: 25, max: 30 },
  "60plus": { min: 28, max: 36 },
};

// Splits recomendados por frequência (consolidado)
const RECOMMENDED_SPLITS: Record<string, string> = {
  "1":   "Full Body Único",
  "2":   "Full Body A/B",
  "3":   "Full Body 3x (iniciantes) ou FB + A/B (intermediários+)",
  "4":   "Upper/Lower A/B",
  "5":   "Híbrido (Sup-Inf-Puxar-Empurrar-Inf)",
  "6":   "Push/Pull/Legs 2x",
  "7":   "PPL 2x + Especialização",
};

// ═══════════════════════════════════════════════════════════════════════════════
//                          TEMPO POR SESSÃO
// ═══════════════════════════════════════════════════════════════════════════════

// Tempo médio por série (execução + descanso) em segundos, por objetivo
const TIME_PER_SET_BY_GOAL: Record<string, number> = {
  "weight_loss":  85,   // 40s execução + 45s descanso
  "hypertrophy":  135,  // 45s execução + 90s descanso
  "health":       100,  // 40s execução + 60s descanso  
  "performance":  170,  // 50s execução + 120s descanso
};

const WARMUP_MINUTES = 5;
const SESSION_TIME_TOLERANCE = 0.15; // 15% de tolerância

function getDurationMinutes(duration: string): number {
  if (duration.includes("30")) return 30;
  if (duration.includes("45")) return 45;
  if (duration.includes("60") && !duration.includes("+") && !duration.includes("plus")) return 60;
  return 75; // 60plus
}

function getFrequencyKey(days: number): string {
  if (days <= 0) return "1";
  if (days >= 7) return "7";
  return days.toString();
}

function hasLowRecovery(sleepHours: string | null, stressLevel: string | null): boolean {
  const sleepMapping: Record<string, number> = {
    "less5": 4, "5-6": 5, "6-7": 6, "7-8": 7, "more8": 9
  };
  const sleepNum = sleepMapping[sleepHours || "7-8"] || 7;
  return sleepNum < 6 || stressLevel === "high";
}

/**
 * NOVO CÁLCULO DE VOLUME - Baseado no Documento Técnico
 * 
 * 1. Determina range base por FREQUÊNCIA SEMANAL (quantos dias treina)
 * 2. Aplica limites do OBJETIVO (hipertrofia, emagrecimento, saúde)
 * 3. Calcula interseção dos dois ranges
 * 4. Verifica capacidade da sessão (séries por treino × dias)
 * 5. Ajusta por nível de experiência (multiplicador suave)
 * 6. Ajusta por recuperação (redução máxima de 10%)
 */
function calculateVolumeRanges(params: {
  experienceLevel: string;
  goal: string | null;
  sessionDuration: string | null;
  trainingDaysCount: number;
  sleepHours: string | null;
  stressLevel: string | null;
}): CalculatedVolumeRanges {
  const { experienceLevel, goal, sessionDuration, trainingDaysCount, sleepHours, stressLevel } = params;
  
  // 1. Range base por FREQUÊNCIA SEMANAL
  const frequencyKey = getFrequencyKey(trainingDaysCount);
  const frequencyRange = FREQUENCY_VOLUME_RANGES[frequencyKey] || FREQUENCY_VOLUME_RANGES["3"];
  
  // 2. Range por OBJETIVO
  const goalRange = GOAL_VOLUME_RANGES[goal || "health"] || GOAL_VOLUME_RANGES["health"];
  
  // 3. INTERSEÇÃO dos dois ranges (o range final válido)
  const intersectionMin = Math.max(frequencyRange.min, goalRange.min);
  const intersectionMax = Math.min(frequencyRange.max, goalRange.max);
  
  // Garantir que min <= max (caso não haja interseção válida, usar médias)
  const weeklyMin = intersectionMin <= intersectionMax ? intersectionMin : Math.round((frequencyRange.min + goalRange.min) / 2);
  const weeklyMax = intersectionMin <= intersectionMax ? intersectionMax : Math.round((frequencyRange.max + goalRange.max) / 2);
  
  // 4. Capacidade da sessão (séries por treino × dias)
  const setsPerWorkout = SESSION_SETS_PER_WORKOUT[sessionDuration || "45min"];
  const maxPossibleWeekly = setsPerWorkout.max * trainingDaysCount;
  
  // 5. Multiplicador por NÍVEL DE EXPERIÊNCIA
  // Iniciantes: 80% do range (adaptação ao treino)
  // Intermediários: 100% (padrão)
  // Avançados: 110% (podem tolerar mais volume)
  const levelMultipliers: Record<string, number> = {
    "beginner": 0.85,
    "intermediate": 1.0,
    "advanced": 1.10,
  };
  const levelMultiplier = levelMultipliers[experienceLevel] || 1.0;
  
  // 6. Multiplicador por RECUPERAÇÃO (máximo -10%, não -25%)
  // Se sono < 6h OU estresse alto: reduz 10%
  const lowRecovery = hasLowRecovery(sleepHours, stressLevel);
  const recoveryMultiplier = lowRecovery ? 0.90 : 1.00;
  
  // 7. Calcular volumes finais
  const adjustedMin = Math.round(weeklyMin * levelMultiplier);
  const adjustedMax = Math.round(Math.min(weeklyMax * levelMultiplier * recoveryMultiplier, maxPossibleWeekly));
  
  // Garantir range mínimo de 4 séries entre min e max
  const finalMin = adjustedMin;
  const finalMax = Math.max(adjustedMax, adjustedMin + 4);
  
  // Proporcionar para grupos musculares
  // Large: 100% do range (grupos principais)
  // Medium: 75% do range (ombros - recebem trabalho indireto)
  // Small: 50-60% do range (braços, core - menor volume necessário)
  return {
    large: { 
      min: finalMin, 
      max: finalMax 
    },
    medium: { 
      min: Math.round(finalMin * 0.70), 
      max: Math.round(finalMax * 0.80) 
    },
    small: { 
      min: Math.round(finalMin * 0.50), 
      max: Math.round(finalMax * 0.65) 
    },
    setsPerWorkout,
    recommendedSplit: RECOMMENDED_SPLITS[frequencyKey],
    factors: {
      frequency: frequencyKey,
      goal: goal || "health",
      duration: sessionDuration || "45min",
      level: levelMultiplier,
      recovery: recoveryMultiplier,
    },
  };
}

function getMuscleCategory(muscle: string): "large" | "medium" | "small" {
  const largeGroups = ["chest", "back", "quadriceps", "hamstrings", "glutes"];
  const mediumGroups = ["shoulders", "scapular_belt"];
  
  if (largeGroups.includes(muscle.toLowerCase())) return "large";
  if (mediumGroups.includes(muscle.toLowerCase())) return "medium";
  return "small";
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          PERIODIZAÇÃO DINÂMICA
// ═══════════════════════════════════════════════════════════════════════════════

interface PeriodizationConfig {
  type: "linear" | "undulating" | "linear_undulating";
  description: string;
  weeklyPattern: string;
  progressionRules: string[];
}

/**
 * PERIODIZAÇÃO DINÂMICA conforme documento técnico:
 * - ≤3 dias/semana: Periodização LINEAR
 * - ≥4 dias/semana: Periodização LINEAR + ONDULATÓRIA
 * - Ajuste adicional por nível e objetivo
 */
function determinePeriodization(params: {
  trainingDaysCount: number;
  experienceLevel: string;
  goal: string | null;
}): PeriodizationConfig {
  const { trainingDaysCount, experienceLevel, goal } = params;
  
  // Regra base: frequência determina tipo de periodização
  const isHighFrequency = trainingDaysCount >= 4;
  const isAdvanced = experienceLevel === "advanced";
  const isIntermediate = experienceLevel === "intermediate";
  const isHypertrophy = goal === "hypertrophy";
  
  // ≤3 dias/semana: sempre LINEAR
  if (!isHighFrequency) {
    return {
      type: "linear",
      description: "Progressão linear clássica - aumentar carga/reps semanalmente",
      weeklyPattern: "Semanas 1-4: aumento progressivo de 2.5-5% na carga ou 1-2 reps",
      progressionRules: [
        "Semana 1: Adaptação - 60-70% do esforço máximo",
        "Semana 2: Acumulação - 70-80% do esforço",
        "Semana 3: Intensificação - 80-90% do esforço",
        "Semana 4: Pico - 85-95% do esforço",
        "Semana 5: Deload - 50-60% do volume",
      ],
    };
  }
  
  // ≥4 dias/semana para iniciantes: ainda LINEAR (por simplicidade)
  if (isHighFrequency && !isIntermediate && !isAdvanced) {
    return {
      type: "linear",
      description: "Progressão linear para iniciantes - foco em técnica e adaptação",
      weeklyPattern: "Aumento gradual de carga mantendo técnica perfeita",
      progressionRules: [
        "Semana 1-2: Aprender movimentos, carga leve",
        "Semana 3-4: Aumentar carga 5-10% se técnica impecável",
        "Semana 5: Deload leve - consolidar aprendizado",
      ],
    };
  }
  
  // ≥4 dias/semana para intermediários/avançados: LINEAR + ONDULATÓRIA
  if (isHighFrequency && (isIntermediate || isAdvanced)) {
    // Ondulação mais intensa para hipertrofia
    if (isHypertrophy) {
      return {
        type: "linear_undulating",
        description: "Periodização linear + ondulatória diária para hipertrofia",
        weeklyPattern: "Alternar intensidades entre sessões: Força (6-8) → Hipertrofia (8-12) → Metabólico (12-15)",
        progressionRules: [
          "Sessão A (Força): 6-8 reps, descanso 2-3min, carga alta",
          "Sessão B (Hipertrofia): 8-12 reps, descanso 60-90s, carga moderada",
          "Sessão C (Metabólico): 12-15 reps, descanso 45-60s, carga leve-moderada",
          "Progressão semanal: +2.5% na carga OU +1 rep por sessão",
          "Semana 4-5: Deload - reduzir volume 40%, manter intensidade",
        ],
      };
    }
    
    // Outros objetivos: ondulação moderada
    return {
      type: "linear_undulating",
      description: "Periodização linear com ondulação semanal",
      weeklyPattern: "Semanas alternando entre maior volume e maior intensidade",
      progressionRules: [
        "Semana 1: Volume alto, intensidade moderada",
        "Semana 2: Volume moderado, intensidade alta",
        "Semana 3: Volume alto, intensidade moderada-alta",
        "Semana 4: Volume moderado-baixo, intensidade máxima",
        "Semana 5: Deload - 50% do volume",
      ],
    };
  }
  
  // Fallback: linear
  return {
    type: "linear",
    description: "Progressão linear padrão",
    weeklyPattern: "Aumento gradual semana a semana",
    progressionRules: [
      "Semanas 1-4: progressão gradual",
      "Semana 5: deload",
    ],
  };
}

function getPeriodizationLabel(config: PeriodizationConfig): string {
  const typeLabels: Record<string, string> = {
    linear: "LINEAR",
    undulating: "ONDULATÓRIA",
    linear_undulating: "LINEAR + ONDULATÓRIA",
  };
  return typeLabels[config.type] || "LINEAR";
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          EQUIPMENT FILTERING
// ═══════════════════════════════════════════════════════════════════════════════

const EQUIPMENT_MAPPING: Record<string, string[]> = {
  machines: [
    "Máquina", "Máquina Assistida", "Máquina Scott", "Máquina/Anilha", "Máquina/Placas",
    "Cabos", "Puxador Alto", "Puxador Baixo", "Leg Press", "Leg Press Horizontal",
    "Leg Press Inclinado", "Leg Press Sentado", "Hack Machine", "Smith",
    "Esteira", "Bicicleta", "Elíptico", "Transport", "Remo"
  ],
  free_weights: [
    "Halter", "Barra", "Barra Fixa", "Barra H", "Banco", "Banco Inclinado",
    "Tornozeleira", "Fitball", "Calço"
  ],
  bodyweight: [
    "Peso Corporal", "Barra Fixa"
  ],
};

interface ExerciseWithEquipment {
  name: string;
  muscle_group: string;
  movement_pattern: string | null;
  training_level: string;
  equipment: string | null;
}

function filterExercisesByEquipment(
  exercises: ExerciseWithEquipment[],
  userPreferences: string[]
): ExerciseWithEquipment[] {
  if (!userPreferences || userPreferences.length === 0 || userPreferences.length === 3) {
    return exercises;
  }

  const allowedEquipment = new Set<string>();
  for (const pref of userPreferences) {
    const equipmentList = EQUIPMENT_MAPPING[pref];
    if (equipmentList) {
      equipmentList.forEach(eq => allowedEquipment.add(eq));
    }
  }

  return exercises.filter(exercise => {
    if (!exercise.equipment) {
      return userPreferences.includes("bodyweight");
    }
    return allowedEquipment.has(exercise.equipment);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          INJURY-BASED EXERCISE FILTERING
// ═══════════════════════════════════════════════════════════════════════════════

interface InjuryContraindications {
  muscleGroups: string[];
  movementPatterns: string[];
  exerciseNamePatterns: string[];
}

const INJURY_CONTRAINDICATIONS: Record<string, InjuryContraindications> = {
  shoulder: {
    muscleGroups: [],
    movementPatterns: [],
    exerciseNamePatterns: [
      "Desenv.", "Abdução dos ombros", "Flexão dos ombros",
      "Supino Inclinado", "Pull Over", "Crucifixo Inclinado",
    ],
  },
  lower_back: {
    muscleGroups: [],
    movementPatterns: ["Dominância de Quadril"],
    exerciseNamePatterns: [
      "Stiff", "Remada Curvado", "Levantamento Terra",
      "Good Morning", "Hiperextensão", "Agachamento Livre",
    ],
  },
  cervical: {
    muscleGroups: [],
    movementPatterns: [],
    exerciseNamePatterns: [
      "Desenv.", "Encolhimento", "Remada Alta", "Agachamento",
    ],
  },
  knee: {
    muscleGroups: [],
    movementPatterns: ["Dominância de Joelho"],
    exerciseNamePatterns: [
      "Agachamento", "Leg Press", "Afundo", "Avanço",
      "Cadeira Extensora", "Passada", "Sissy", "Hack",
    ],
  },
  hip: {
    muscleGroups: [],
    movementPatterns: ["Dominância de Quadril"],
    exerciseNamePatterns: [
      "Agachamento", "Afundo", "Avanço", "Cadeira Adutora",
      "Cadeira Abdutora", "Stiff", "Levantamento Terra",
    ],
  },
  ankle_foot: {
    muscleGroups: [],
    movementPatterns: ["Dominância de Tornozelo"],
    exerciseNamePatterns: [
      "Panturrilha", "Elevação de calcanhar", "Gêmeos", "Agachamento Livre",
    ],
  },
};

function filterExercisesByInjuries(
  exercises: ExerciseWithEquipment[],
  injuryAreas: string[]
): { filtered: ExerciseWithEquipment[]; excludedCount: number; excludedByArea: Record<string, number> } {
  if (!injuryAreas || injuryAreas.length === 0) {
    return { filtered: exercises, excludedCount: 0, excludedByArea: {} };
  }

  const excludedMuscleGroups = new Set<string>();
  const excludedPatterns = new Set<string>();
  const excludedNamePatterns: string[] = [];

  for (const area of injuryAreas) {
    const contraindications = INJURY_CONTRAINDICATIONS[area];
    if (contraindications) {
      contraindications.muscleGroups.forEach(g => excludedMuscleGroups.add(g));
      contraindications.movementPatterns.forEach(p => excludedPatterns.add(p));
      excludedNamePatterns.push(...contraindications.exerciseNamePatterns);
    }
  }

  const excludedByArea: Record<string, number> = {};
  injuryAreas.forEach(a => excludedByArea[a] = 0);

  const filtered = exercises.filter(exercise => {
    if (excludedMuscleGroups.has(exercise.muscle_group)) {
      for (const area of injuryAreas) {
        if (INJURY_CONTRAINDICATIONS[area]?.muscleGroups.includes(exercise.muscle_group)) {
          excludedByArea[area]++;
          break;
        }
      }
      return false;
    }

    if (exercise.movement_pattern && excludedPatterns.has(exercise.movement_pattern)) {
      for (const area of injuryAreas) {
        if (INJURY_CONTRAINDICATIONS[area]?.movementPatterns.includes(exercise.movement_pattern)) {
          excludedByArea[area]++;
          break;
        }
      }
      return false;
    }

    for (const pattern of excludedNamePatterns) {
      if (exercise.name.includes(pattern)) {
        for (const area of injuryAreas) {
          if (INJURY_CONTRAINDICATIONS[area]?.exerciseNamePatterns.some(p => exercise.name.includes(p))) {
            excludedByArea[area]++;
            break;
          }
        }
        return false;
      }
    }

    return true;
  });

  return {
    filtered,
    excludedCount: exercises.length - filtered.length,
    excludedByArea,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          VALIDATION SCHEMAS FOR AI RESPONSE
// ═══════════════════════════════════════════════════════════════════════════════

const WorkoutExerciseSchema = z.object({
  order: z.number(),
  name: z.string(),
  equipment: z.string(),
  muscleGroup: z.string(),
  sets: z.number().min(1).max(10),
  reps: z.string(),
  rest: z.string(),
  intensity: z.string(),
  notes: z.string(),
  isCompound: z.boolean(),
  alternatives: z.array(z.string()).optional(),
});

const WorkoutDaySchema = z.object({
  day: z.string(),
  name: z.string(),
  focus: z.string(),
  muscleGroups: z.array(z.string()),
  estimatedDuration: z.string(),
  warmup: z.object({
    description: z.string(),
    duration: z.string(),
    exercises: z.array(z.string()),
  }).optional(),
  exercises: z.array(WorkoutExerciseSchema),
  finisher: z.any().nullable().optional(),
  cardio: z.any().nullable().optional(),
});

const WorkoutPlanSchema = z.object({
  planName: z.string(),
  description: z.string(),
  weeklyFrequency: z.number(),
  sessionDuration: z.string(),
  periodization: z.enum(["linear", "undulating", "linear_undulating"]),
  periodizationDescription: z.string().optional(),
  experienceLevel: z.string().optional(),
  mainGoal: z.string().optional(),
  weeklyVolumeStrategy: z.string().optional(),
  workouts: z.array(WorkoutDaySchema),
  weeklyVolume: z.record(z.number()).optional(),
  progressionPlan: z.any().optional(),
  adaptations: z.any().optional(),
  warnings: z.array(z.string()).optional(),
  motivationalMessage: z.string().optional(),
  coachNotes: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
//                          POST-AI VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

interface ValidationResult {
  success: boolean;
  warnings: string[];
  errors: string[];
}

interface Exercise {
  name: string;
  muscle_group: string;
  movement_pattern: string | null;
  training_level: string;
  equipment: string | null;
}

function validateWorkoutPlan(
  rawPlan: unknown,
  catalogExercises: Exercise[],
  userData: { 
    trainingDays: string[]; 
    injuryAreas: string[];
    experienceLevel: string | null;
    goal: string | null;
    sessionDuration: string | null;
    sleepHours: string | null;
    stressLevel: string | null;
    bodyAreas: string[];
  }
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // 1. Validate structure with Zod
  const structureResult = WorkoutPlanSchema.safeParse(rawPlan);
  if (!structureResult.success) {
    console.warn("Structure validation issues:", structureResult.error.issues);
    errors.push("Estrutura do plano inválida: " + structureResult.error.issues.map(i => i.message).join(", "));
  }
  
  const plan = rawPlan as any;
  const catalogNames = new Set(
    catalogExercises.map(e => e.name.toLowerCase().trim())
  );
  
  // 2. Check exercises against catalog
  let unknownExercises = 0;
  for (const workout of plan.workouts || []) {
    for (const exercise of workout.exercises || []) {
      if (!catalogNames.has(exercise.name?.toLowerCase().trim())) {
        unknownExercises++;
        if (unknownExercises <= 5) {
          warnings.push(`Exercício não encontrado no catálogo: "${exercise.name}"`);
        }
      }
    }
  }
  if (unknownExercises > 5) {
    warnings.push(`...e mais ${unknownExercises - 5} exercícios não encontrados no catálogo`);
  }
  
  // 3. Verify number of training days
  const expectedDays = userData.trainingDays?.length || 3;
  const actualDays = plan.workouts?.length || 0;
  if (actualDays !== expectedDays) {
    errors.push(`Número de treinos (${actualDays}) diferente dos dias selecionados (${expectedDays})`);
  }
  
  // 4. Check for alternatives when user has injuries
  if (userData.injuryAreas && userData.injuryAreas.length > 0) {
    let exercisesWithoutAlternatives = 0;
    for (const workout of plan.workouts || []) {
      for (const exercise of workout.exercises || []) {
        if (!exercise.alternatives || exercise.alternatives.length === 0) {
          exercisesWithoutAlternatives++;
        }
      }
    }
    if (exercisesWithoutAlternatives > 0) {
      warnings.push(`${exercisesWithoutAlternatives} exercícios sem alternativas para usuário com lesão`);
    }
  }
  
  // 5. VALIDATE WEEKLY VOLUME using NEW calculation system
  const dynamicRanges = calculateVolumeRanges({
    experienceLevel: userData.experienceLevel || "beginner",
    goal: userData.goal,
    sessionDuration: userData.sessionDuration,
    trainingDaysCount: userData.trainingDays?.length || 3,
    sleepHours: userData.sleepHours,
    stressLevel: userData.stressLevel,
  });
  
  console.log(`Volume validation - Freq: ${dynamicRanges.factors.frequency}, Goal: ${dynamicRanges.factors.goal}, Duration: ${dynamicRanges.factors.duration}`);
  console.log(`Volume ranges - Large: ${dynamicRanges.large.min}-${dynamicRanges.large.max}, Medium: ${dynamicRanges.medium.min}-${dynamicRanges.medium.max}, Small: ${dynamicRanges.small.min}-${dynamicRanges.small.max}`);
  
  const weeklyVolume = plan.weeklyVolume || {};
  
  // Muscle groups to validate
  const muscleGroups = {
    large: ["chest", "back", "quadriceps", "hamstrings", "glutes"],
    medium: ["shoulders", "scapular_belt"],
    small: ["biceps", "triceps", "calves", "core"],
  };
  
  // 5b. VALIDATE BACK vs CHEST RATIO (Pull/Push balance)
  const backVolume = weeklyVolume["back"] || 0;
  const chestVolume = weeklyVolume["chest"] || 0;
  
  // Check if user has chest as priority area
  const chestIsPriority = (userData.bodyAreas || []).some(area => 
    ["peitoral", "peito", "chest"].includes(area.toLowerCase())
  );
  
  // If chest is NOT priority, back should be >= chest
  if (!chestIsPriority && backVolume > 0 && chestVolume > 0) {
    if (backVolume < chestVolume) {
      warnings.push(
        `Volume de Costas (${backVolume}) deve ser >= Peitoral (${chestVolume}) para equilíbrio postural`
      );
    }
  }
  
  // Check if muscle is a priority area (allow +30% volume)
  const isPriorityGroup = (muscle: string): boolean => {
    const normalizedAreas = (userData.bodyAreas || []).map(a => a.toLowerCase());
    const muscleAliases: Record<string, string[]> = {
      "chest": ["peitoral", "peito", "chest"],
      "back": ["costas", "dorsal", "back"],
      "shoulders": ["ombros", "deltoides", "shoulders"],
      "biceps": ["biceps", "bíceps"],
      "triceps": ["triceps", "tríceps"],
      "quadriceps": ["quadriceps", "quadríceps", "coxas", "pernas"],
      "hamstrings": ["isquiotibiais", "posteriores", "hamstrings"],
      "glutes": ["gluteos", "glúteos", "bumbum", "glutes"],
      "calves": ["panturrilhas", "calves"],
      "core": ["abdomen", "abdômen", "core", "barriga"],
    };
    
    const aliases = muscleAliases[muscle.toLowerCase()] || [muscle.toLowerCase()];
    return normalizedAreas.some(area => 
      aliases.some(alias => area.includes(alias) || alias.includes(area))
    );
  };
  
  let missingGroups = 0;
  
  // Validate each muscle group with 15% tolerance
  const TOLERANCE = 0.15;
  
  Object.entries(muscleGroups).forEach(([category, muscles]) => {
    const baseRange = dynamicRanges[category as keyof VolumeRanges] as VolumeRange;
    
    muscles.forEach((muscle) => {
      const volume = weeklyVolume[muscle];
      
      if (volume === undefined || volume === null) {
        missingGroups++;
        return;
      }
      
      // Priority groups can have +30% more volume
      const priorityBoost = isPriorityGroup(muscle) ? 1.30 : 1.00;
      const effectiveMax = Math.round(baseRange.max * priorityBoost);
      const effectiveMin = baseRange.min;
      
      // Apply tolerance
      const minWithTolerance = Math.round(effectiveMin * (1 - TOLERANCE));
      const maxWithTolerance = Math.round(effectiveMax * (1 + TOLERANCE));
      
      if (volume < minWithTolerance) {
        warnings.push(
          `Volume baixo para ${muscle}: ${volume} séries (mínimo: ${effectiveMin})`
        );
      }
      
      if (volume > maxWithTolerance) {
        warnings.push(
          `Volume alto para ${muscle}: ${volume} séries (máximo: ${effectiveMax})`
        );
      }
    });
  });
  
  if (missingGroups > 5) {
    errors.push(`Estrutura weeklyVolume incompleta: ${missingGroups} grupos musculares não informados`);
  }
  
  // 6. Validate exercise count per session
  const sessionDuration = plan.sessionDuration || "45 min";
  let minExercises = 4;
  let maxExercises = 10;
  
  if (sessionDuration.includes("30")) {
    minExercises = 4; maxExercises = 6;
  } else if (sessionDuration.includes("45")) {
    minExercises = 5; maxExercises = 7;
  } else if (sessionDuration.includes("60") && !sessionDuration.includes("+")) {
    minExercises = 6; maxExercises = 8;
  } else {
    minExercises = 7; maxExercises = 10;
  }
  
  for (const workout of plan.workouts || []) {
    const exerciseCount = workout.exercises?.length || 0;
    if (exerciseCount < minExercises - 1) {
      warnings.push(`Treino "${workout.name}" tem apenas ${exerciseCount} exercícios (mínimo esperado: ${minExercises})`);
    }
    if (exerciseCount > maxExercises + 2) {
      warnings.push(`Treino "${workout.name}" tem ${exerciseCount} exercícios (máximo esperado: ${maxExercises})`);
    }
  }
  
  // 7. VALIDATE SESSION TIME - Verificar se séries cabem no tempo disponível
  const sessionDurationKey = userData.sessionDuration || "45min";
  const maxMinutes = getDurationMinutes(sessionDurationKey);
  const availableMinutes = maxMinutes - WARMUP_MINUTES;
  const timePerSet = TIME_PER_SET_BY_GOAL[userData.goal || "health"];
  const expectedSetsRange = SESSION_SETS_PER_WORKOUT[sessionDurationKey];

  for (const workout of plan.workouts || []) {
    const totalSets = workout.exercises?.reduce(
      (sum: number, ex: any) => sum + (ex.sets || 0), 0
    ) || 0;
    
    const estimatedMinutes = Math.round((totalSets * timePerSet) / 60);
    const totalSessionMinutes = estimatedMinutes + WARMUP_MINUTES;
    
    // Log detalhado para debug
    console.log(`Session time validation "${workout.name}": ${totalSets} sets, ~${totalSessionMinutes}min (limit: ${maxMinutes}min)`);
    
    // Validar total de séries contra limite esperado
    if (totalSets < expectedSetsRange.min) {
      warnings.push(
        `Treino "${workout.name}": ${totalSets} séries (mínimo esperado: ${expectedSetsRange.min})`
      );
    }
    if (totalSets > expectedSetsRange.max) {
      warnings.push(
        `Treino "${workout.name}": ${totalSets} séries (máximo esperado: ${expectedSetsRange.max})`
      );
    }
    
    // Validar tempo estimado vs disponível (com tolerância de 15%)
    if (totalSessionMinutes > maxMinutes * (1 + SESSION_TIME_TOLERANCE)) {
      warnings.push(
        `Treino "${workout.name}": tempo estimado ~${totalSessionMinutes}min excede ${maxMinutes}min disponíveis`
      );
    }
  }
  
  return { 
    success: errors.length === 0, 
    warnings,
    errors 
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          INJURY AREA LABELS
// ═══════════════════════════════════════════════════════════════════════════════

function getInjuryLabel(area: string): string {
  const labels: Record<string, string> = {
    shoulder: "Ombro",
    lower_back: "Lombar",
    cervical: "Cervical",
    knee: "Joelho",
    hip: "Quadril",
    ankle_foot: "Tornozelo/Pé",
  };
  return labels[area] || area;
}

function getInjuryAdaptationRules(area: string): string {
  const rules: Record<string, string> = {
    shoulder: "EVITAR overhead pesado, supino aberto >90°, mergulho. PRIORIZAR rotadores externos, estabilizadores escapulares.",
    lower_back: "EVITAR agachamento livre pesado, stiff com carga alta, deadlift convencional. PRIORIZAR core anti-rotacional, máquinas sentado.",
    cervical: "EVITAR exercícios com carga sobre ombros/trapézio. PREFERIR máquinas com apoio, cabos.",
    knee: "EVITAR agachamento profundo, saltos, lunges profundos. PRIORIZAR isométricos, amplitude controlada.",
    hip: "EVITAR agachamento profundo, abdução pesada, rotações. PRIORIZAR mobilidade de quadril, ativação glútea.",
    ankle_foot: "EVITAR exercícios de impacto, saltos, corrida. SUBSTITUIR por bike, elíptico, remo.",
  };
  return rules[area] || "";
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          SYSTEM PROMPT (ATUALIZADO)
// ═══════════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Você é um prescritor de exercícios físicos altamente qualificado para academias low-cost. Você DEVE gerar planos de treino personalizados seguindo RIGOROSAMENTE TODAS as diretrizes técnicas abaixo. NUNCA ignore uma regra.

IMPORTANTE: TODO o output (planName, description, notes, etc.) DEVE ser em PORTUGUÊS BRASILEIRO.

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 1: VOLUME SEMANAL (DOCUMENTO TÉCNICO)
═══════════════════════════════════════════════════════════════════════════════

## CÁLCULO DE VOLUME BASEADO EM FREQUÊNCIA + OBJETIVO

O volume semanal (séries por grupamento) é determinado pela INTERSEÇÃO de:

### TABELA 1: Volume por FREQUÊNCIA SEMANAL
| Frequência | Min | Max | Split Recomendado |
|------------|-----|-----|-------------------|
| 1 dia      | 4   | 10  | Full Body Único |
| 2 dias     | 4   | 12  | Full Body A/B |
| 3 dias     | 6   | 15  | Full Body ou FB + A/B |
| 4 dias     | 8   | 18  | Upper/Lower A/B |
| 5 dias     | 10  | 20  | Híbrido |
| 6 dias     | 12  | 20  | PPL 2x |
| 7 dias     | 12  | 20  | PPL 2x + Especialização |

### TABELA 2: Volume por OBJETIVO
| Objetivo      | Min | Max | Característica |
|---------------|-----|-----|----------------|
| Emagrecimento | 8   | 20  | Alta densidade, pausas curtas |
| Hipertrofia   | 10  | 25  | Volume máximo, progressão de carga |
| Saúde         | 6   | 14  | Submáximo, foco em técnica |
| Performance   | 8   | 18  | Foco em intensidade |

### TABELA 3: Séries por TREINO (conforme duração)
| Duração  | Séries/Treino | Exercícios |
|----------|---------------|------------|
| 30 min   | 12-18         | 4-6 exercícios |
| 45 min   | 19-24         | 5-7 exercícios |
| 60 min   | 25-30         | 6-8 exercícios |
| 60+ min  | 28-36         | 7-10 exercícios |

### AJUSTES:
- **Nível**: Iniciante ×0.85 | Intermediário ×1.0 | Avançado ×1.10
- **Recuperação baixa** (sono <6h ou estresse alto): ×0.90 (máximo -10%)

### REGRA CRÍTICA:
O prompt do usuário contém uma TABELA com os valores EXATOS calculados.
SIGA ESSES VALORES À RISCA - eles já consideram todos os fatores.

### DISTRIBUIÇÃO DO VOLUME:
- O volume semanal DEVE ser DISTRIBUÍDO entre as sessões
- Priorizar frequência de 2-3x por semana por grupo muscular
- NÃO concentrar todo o volume em uma única sessão

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 2: REPETIÇÕES E INTENSIDADE
═══════════════════════════════════════════════════════════════════════════════

## Faixas de Repetições por Objetivo:

### HIPERTROFIA (documento técnico):
| Faixa        | Reps     | Intensidade | Descanso    | Quando Usar |
|--------------|----------|-------------|-------------|-------------|
| Força-Hipert | 6-8      | 75-85% 1RM  | 2-3 min     | Compostos principais, avançados |
| Hipertrofia  | 8-12     | 65-80% 1RM  | 90-120s     | Compostos e isoladores primários |
| Metabólico   | 12-15    | 60-70% 1RM  | 60-90s      | Isoladores, acabamento |
| Alto Rep     | 15-20    | 50-65% 1RM  | 45-60s      | Panturrilhas, finalizadores |

### FORÇA (avançados - apenas se objetivo = performance):
| Faixa        | Reps     | Intensidade | Descanso    |
|--------------|----------|-------------|-------------|
| Força Máxima | 2-4      | 85-95% 1RM  | 3-5 min     |
| Força-Hipert | 4-6      | 80-90% 1RM  | 2-4 min     |

### EMAGRECIMENTO:
| Faixa        | Reps     | Intensidade | Descanso    |
|--------------|----------|-------------|-------------|
| Circuito     | 12-15    | 50-65% 1RM  | 30-45s      |
| Metabólico   | 15-20    | 40-60% 1RM  | 30-60s      |

### SAÚDE:
| Faixa        | Reps     | Intensidade | Descanso    |
|--------------|----------|-------------|-------------|
| Geral        | 10-15    | 60-75% 1RM  | 45-75s      |
| RIR: 2-4 (não treinar até falha)

## Intervalos Dinâmicos por Faixa de Repetições:
| Repetições | Descanso Mínimo | Descanso Máximo | Aplicação |
|------------|-----------------|-----------------|-----------|
| 2-6 reps   | 2 min           | 4 min           | Força, compostos pesados |
| 6-8 reps   | 90s             | 3 min           | Força-hipertrofia |
| 8-12 reps  | 60s             | 2 min           | Hipertrofia clássica |
| 12-15 reps | 45s             | 90s             | Metabólico, isoladores |
| 15-20 reps | 30s             | 60s             | Alto rep, circuitos |

## REGRA: Prescrever descanso baseado na FAIXA de repetições do exercício, não apenas no objetivo geral.

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 3: DIVISÕES DE TREINO (CONSOLIDADO)
═══════════════════════════════════════════════════════════════════════════════

## REGRA FUNDAMENTAL:
Estimular cada grupo 2-3x/semana é SUPERIOR a 1x/semana.
Distribua o volume semanal em múltiplas sessões.

## REGRA DE RECUPERAÇÃO (Soft Rule):
EVITAR (mas não proibir) estímulos para o mesmo grupo em dias CONSECUTIVOS.
- Se inevitável, REDUZIR volume no segundo dia em 20-30%
- Priorizar 48-72h entre estímulos do mesmo grupo

═══════════════════════════════════════════════════════════════════════════════
### 1x/SEMANA - Full Body Único
═══════════════════════════════════════════════════════════════════════════════
| Dia | Tipo | Grupos |
|-----|------|--------|
| 1 | Full Body | Todos (1 exercício por grupo) |

- Estímulos: 1x/semana por grupo (subótimo, usar apenas se necessário)
- Volume: Concentrar 100% em 1 sessão
- Regra: Priorizar multiarticulares, 1-2 isoladores

═══════════════════════════════════════════════════════════════════════════════
### 2x/SEMANA - Full Body A/B
═══════════════════════════════════════════════════════════════════════════════
| Dia | Tipo | Grupos |
|-----|------|--------|
| 1 | Full Body A | Todos (ênfase em compostos) |
| 2 | Full Body B | Todos (ênfase em isoladores) |

- Estímulos: 2x/semana por grupo ✅
- Conflitos: NENHUM (dias alternados obrigatório)
- Sugestão: Seg/Qui ou Ter/Sex

═══════════════════════════════════════════════════════════════════════════════
### 3x/SEMANA
═══════════════════════════════════════════════════════════════════════════════

**OPÇÃO A - Full Body 3x (INICIANTES):**
| Dia | Tipo | Grupos |
|-----|------|--------|
| 1 | Full Body | Todos |
| 2 | Full Body | Todos |
| 3 | Full Body | Todos |

- Estímulos: 3x/semana por grupo ✅
- ⚠️ CONFLITO: Se dias consecutivos, há repetição
- OBRIGATÓRIO: Treinar em dias ALTERNADOS (Seg/Qua/Sex ou Ter/Qui/Sáb)

**OPÇÃO B - Full Body + A/B (INTERMEDIÁRIOS/AVANÇADOS):**
| Dia | Tipo | Grupos |
|-----|------|--------|
| 1 | Full Body | Todos (volume reduzido) |
| 2 | Upper (A) | Peitoral, Costas, Ombros, Bíceps, Tríceps |
| 3 | Lower (B) | Quadríceps, Posteriores, Glúteos, Panturrilhas |

- Estímulos: 2x/semana por grupo ✅
- ⚠️ CONFLITO: FB → A (membros superiores consecutivos)
- RECOMENDADO: Dias alternados (Seg/Qua/Sex)

═══════════════════════════════════════════════════════════════════════════════
### 4x/SEMANA - Upper/Lower A/B
═══════════════════════════════════════════════════════════════════════════════
| Dia | Tipo | Grupos |
|-----|------|--------|
| 1 | Upper A | Peitoral, Costas, Ombros, Bíceps, Tríceps |
| 2 | Lower A | Quadríceps, Posteriores, Glúteos, Panturrilhas |
| 3 | Upper B | Peitoral, Costas, Ombros, Bíceps, Tríceps |
| 4 | Lower B | Quadríceps, Posteriores, Glúteos, Panturrilhas |

- Estímulos: 2x/semana por grupo ✅
- Conflitos: NENHUM (alternância natural upper/lower)
- Ideal para: Todos os níveis

═══════════════════════════════════════════════════════════════════════════════
### 5x/SEMANA - Híbrido (Sup + Inf + Puxar + Empurrar + Inf)
═══════════════════════════════════════════════════════════════════════════════
| Dia | Tipo | Grupos |
|-----|------|--------|
| 1 | Membros Superiores + Tronco | Peitoral, Costas, Ombros, Bíceps, Tríceps |
| 2 | Membros Inferiores | Quadríceps, Posteriores, Glúteos, Panturrilhas |
| 3 | Puxar | Costas, Bíceps (SEM Posteriores) |
| 4 | Empurrar | Peitoral, Ombros, Tríceps |
| 5 | Membros Inferiores | Quadríceps, Posteriores, Glúteos, Panturrilhas |

- Estímulos: 2x/semana por grupo ✅
- Conflitos: NENHUM
- Core/Abdômen: Encaixar no Dia 3 (Puxar) ou Dia 4 (Empurrar)

═══════════════════════════════════════════════════════════════════════════════
### 6x/SEMANA - Push/Pull/Legs 2x
═══════════════════════════════════════════════════════════════════════════════
| Dia | Tipo | Grupos |
|-----|------|--------|
| 1 | Push | Peitoral, Ombros, Tríceps |
| 2 | Pull | Costas, Bíceps |
| 3 | Legs | Quadríceps, Posteriores, Glúteos, Panturrilhas |
| 4 | Push | Peitoral, Ombros, Tríceps |
| 5 | Pull | Costas, Bíceps |
| 6 | Legs | Quadríceps, Posteriores, Glúteos, Panturrilhas |

- Estímulos: 2x/semana por grupo ✅
- Conflitos: NENHUM (sequência natural)
- Alternativa: Arnold Split (Peito/Costas, Ombros/Braços, Pernas) 2x

═══════════════════════════════════════════════════════════════════════════════
### 7x/SEMANA - PPL 2x + Especialização
═══════════════════════════════════════════════════════════════════════════════
| Dia | Tipo | Grupos |
|-----|------|--------|
| 1 | Push | Peitoral, Ombros, Tríceps |
| 2 | Pull | Costas, Bíceps |
| 3 | Legs | Quadríceps, Posteriores, Glúteos, Panturrilhas |
| 4 | Push | Peitoral, Ombros, Tríceps |
| 5 | Pull | Costas, Bíceps |
| 6 | Legs | Quadríceps, Posteriores, Glúteos, Panturrilhas |
| 7 | Especialização | Grupo PRIORITÁRIO do usuário |

- Estímulos: 2-3x/semana por grupo ✅
- ⚠️ REGRA CRÍTICA: O grupo do Dia 7 NÃO pode ser o mesmo do Dia 6 nem do Dia 1
- Se Dia 6 = Legs → Dia 7 ≠ pernas
- Se Dia 1 = Push → Dia 7 ≠ peitoral/ombros/tríceps

═══════════════════════════════════════════════════════════════════════════════
### REGRAS DE SELEÇÃO AUTOMÁTICA
═══════════════════════════════════════════════════════════════════════════════

| Frequência | Iniciante | Intermediário | Avançado |
|------------|-----------|---------------|----------|
| 1-2 dias | Full Body | Full Body | Full Body |
| 3 dias | Full Body 3x | FB + A/B | FB + A/B |
| 4 dias | Upper/Lower | Upper/Lower | Upper/Lower |
| 5 dias | Híbrido 5x | Híbrido 5x | Híbrido 5x |
| 6 dias | PPL 2x | PPL 2x | Arnold 2x |
| 7 dias | NÃO RECOMENDADO | PPL + Espec. | PPL + Espec. |

## SPLITS QUE REQUEREM DIAS ALTERNADOS (obrigatório):
- Full Body 3x (iniciantes)
- Full Body 2x

## SPLITS AUTO-OTIMIZADOS (sem conflitos naturais):
- Upper/Lower 4x
- Híbrido 5x
- PPL 6x

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 3.1: VERIFICAÇÃO DE TEMPO POR SESSÃO
═══════════════════════════════════════════════════════════════════════════════

## TEMPO MÉDIO POR SÉRIE (incluindo descanso):
| Objetivo      | Tempo/Série | Justificativa |
|---------------|-------------|---------------|
| Emagrecimento | ~1.5 min    | Execução rápida + descanso curto (45s) |
| Hipertrofia   | ~2.25 min   | Execução controlada + descanso médio (90s) |
| Saúde         | ~1.75 min   | Execução leve + descanso moderado (60s) |
| Performance   | ~2.8 min    | Execução intensa + descanso longo (120s) |

## CAPACIDADE POR SESSÃO (tempo útil = tempo total - 5min aquecimento):
| Duração | Tempo Útil | Séries Máx (Hipertrofia) | Séries Máx (Emagrec.) |
|---------|------------|--------------------------|------------------------|
| 30 min  | 25 min     | ~11 séries               | ~16 séries             |
| 45 min  | 40 min     | ~18 séries               | ~26 séries             |
| 60 min  | 55 min     | ~24 séries               | ~36 séries             |
| 60+ min | 70 min     | ~31 séries               | ~46 séries             |

## VERIFICAÇÃO OBRIGATÓRIA ANTES DE FINALIZAR CADA TREINO:
1. Somar TODAS as séries do treino
2. Multiplicar pelo tempo/série do objetivo
3. Adicionar 5 min de aquecimento
4. Verificar se ≤ tempo disponível

## SE ULTRAPASSAR O TEMPO:
1. PRIMEIRO: Reduzir séries dos isoladores (de 4→3, de 3→2)
2. DEPOIS: Remover exercícios isoladores menos importantes
3. NUNCA: Reduzir compostos principais abaixo de 3 séries
4. NUNCA: Remover aquecimento

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 3.2: PERIODIZAÇÃO DINÂMICA
═══════════════════════════════════════════════════════════════════════════════

## REGRA FUNDAMENTAL DE PERIODIZAÇÃO:
A periodização é definida DINAMICAMENTE com base na frequência semanal e nível do usuário.

| Frequência | Nível       | Periodização        | Padrão |
|------------|-------------|---------------------|--------|
| ≤3 dias    | Todos       | LINEAR              | Aumento semanal de carga/reps |
| ≥4 dias    | Iniciante   | LINEAR              | Foco em técnica e adaptação |
| ≥4 dias    | Intermediário | LINEAR + ONDULATÓRIA | Alternar intensidades entre sessões |
| ≥4 dias    | Avançado    | LINEAR + ONDULATÓRIA | Ondulação diária + progressão semanal |

## PERIODIZAÇÃO LINEAR (linear):
- Semana 1: Adaptação (60-70% esforço)
- Semana 2: Acumulação (70-80% esforço)
- Semana 3: Intensificação (80-90% esforço)
- Semana 4: Pico (85-95% esforço)
- Semana 5: Deload (50-60% volume)

## PERIODIZAÇÃO LINEAR + ONDULATÓRIA (linear_undulating):
Aplicar ondulação DIÁRIA entre as sessões:

| Tipo Sessão | Repetições | Descanso | Carga |
|-------------|------------|----------|-------|
| Força       | 6-8 reps   | 2-3 min  | Alta (80-85%) |
| Hipertrofia | 8-12 reps  | 60-90s   | Moderada (70-80%) |
| Metabólico  | 12-15 reps | 45-60s   | Leve-Moderada (60-70%) |

Exemplo 4x/semana Hipertrofia:
- Treino A (Seg): Força-Hipertrofia (8 reps)
- Treino B (Ter): Metabólico (12-15 reps)
- Treino C (Qui): Hipertrofia (10-12 reps)
- Treino D (Sex): Força-Hipertrofia (6-8 reps)

## OBRIGATÓRIO:
- O campo "periodization" no JSON DEVE ser o tipo definido no prompt do usuário
- O campo "progressionPlan" DEVE refletir as semanas de progressão
- O campo "periodizationDescription" DEVE explicar a estratégia

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 4: ESTRUTURA DO TREINO
═══════════════════════════════════════════════════════════════════════════════

## Ordem dos Exercícios:
1. Multiarticulares PRIMEIRO (maior demanda neural)
2. Monoarticulares DEPOIS (isolamento)
3. Grupo prioritário no INÍCIO da sessão

## Por Nível:
- INICIANTE: 70%+ máquinas, foco em técnica
- INTERMEDIÁRIO: 50% máquinas + 50% pesos livres
- AVANÇADO: Pesos livres como base, máquinas para isolamento

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 5: ADAPTAÇÕES POR LESÃO
═══════════════════════════════════════════════════════════════════════════════

## OMBRO:
- EVITAR: overhead pesado, supino inclinado, pullover
- SUBSTITUIR: plano horizontal, cabos, máquinas guiadas
- INCLUIR: rotadores externos, face pull

## LOMBAR:
- EVITAR: stiff pesado, remada curvada, agachamento livre
- SUBSTITUIR: leg press, hip thrust, máquinas sentado
- INCLUIR: core anti-rotacional, dead bug, prancha

## CERVICAL:
- EVITAR: carga sobre ombros, encolhimento pesado
- PREFERIR: máquinas com apoio, cabos

## JOELHO:
- EVITAR: agachamento profundo, leg press profundo, extensora pesada
- SUBSTITUIR: amplitude controlada, isométricos
- PREFERIR: máquinas com controle de ROM

## QUADRIL:
- EVITAR: agachamento profundo, adução/abdução pesada
- SUBSTITUIR: leg press, ponte, ativação glútea

## TORNOZELO/PÉ:
- EVITAR: impacto, saltos, corrida
- SUBSTITUIR: bike, elíptico, remo

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 6: PRIORIZAÇÃO DE GRUPAMENTOS
═══════════════════════════════════════════════════════════════════════════════

## Quando há Foco Declarado:
- AUMENTAR: 20-30% o volume do grupamento priorizado
- POSICIONAR: grupamento no INÍCIO do treino
- DISTRIBUIR: estímulos ao longo da semana
- IMPORTANTE: NÃO REDUZIR volume dos demais grupos abaixo do mínimo

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 6.1: CINTURA ESCAPULAR (OBRIGATÓRIA)
═══════════════════════════════════════════════════════════════════════════════

## REGRA CRÍTICA: A CINTURA ESCAPULAR É FREQUENTEMENTE NEGLIGENCIADA

A Cintura Escapular (deltóide posterior, trapézio médio, romboides) é ESSENCIAL para:
- Equilíbrio postural
- Prevenção de lesões no ombro
- Estabilidade escapular

### REGRA OBRIGATÓRIA:
- Incluir PELO MENOS 1 exercício de Cintura Escapular por semana
- Volume: Tratar como grupo MÉDIO (8-14 séries/semana após ajustes)

### EXERCÍCIOS DO CATÁLOGO PARA CINTURA ESCAPULAR:
- Crucifixo inverso (pegada pronada ou romana)
- Remada pegada aberta (banco alto, cabo ou máquina)
- Face Pull (se disponível)

### POSICIONAMENTO:
- Em dias de COSTAS ou PUXAR
- Após os exercícios principais de Grande Dorsal
- Pode ser feito como superset com deltóide lateral

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 6.2: PROPORÇÃO COSTAS vs EMPURRAR
═══════════════════════════════════════════════════════════════════════════════

## REGRA DE EQUILÍBRIO POSTURAL (Pull/Push Ratio)

Para postura saudável e prevenção de lesões, o volume de PUXAR deve ser 
LIGEIRAMENTE SUPERIOR ao de EMPURRAR.

### Quando NÃO há prioridade declarada para Peitoral:
- Costas (Grande Dorsal): +2-3 séries/semana em relação ao Peitoral
- Exemplo: Se Peitoral = 12 séries, Costas = 14-15 séries
- Proporção Puxar : Empurrar = 1.1:1 até 1.25:1

### Quando HÁ prioridade declarada para Peitoral:
- Manter proporção 1:1 (igualar volumes)
- NÃO reduzir costas abaixo do mínimo

### Exercícios de PUXAR (contabilizar para Costas):
- Puxadas (todas variações)
- Remadas (todas variações exceto as abertas que são Cintura Escapular)
- Pullover

### Exercícios de EMPURRAR (contabilizar para Peitoral):
- Supino (todas variações)
- Crucifixo frontal (peitoral)

### ⚠️ IMPORTANTE:
- Desenvolvimento e elevações de ombro NÃO entram nesta conta
- Deltóide posterior NÃO é "empurrar" - faz parte da cintura escapular

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 7: SONO E ESTRESSE
═══════════════════════════════════════════════════════════════════════════════

## Sono < 6h OU Estresse Alto:
- REDUZIR: volume em até 10% (já calculado nos ranges)
- PRIORIZAR: exercícios simples (máquinas)
- AUMENTAR: pausas em +15-30 segundos
- EVITAR: falha muscular
- EVITAR: métodos avançados

## IMPORTANTE:
- NUNCA prescrever abaixo do mínimo absoluto
- Redução máxima de 10%, não 25%

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 8: MÉTODOS DE INTENSIFICAÇÃO
═══════════════════════════════════════════════════════════════════════════════

## Apenas para Intermediários/Avançados:

- **Drop Set**: Série até falha, reduz 20-30%, repete 2-3x
- **Rest-Pause**: Série até falha, 10-15s pausa, continua
- **Superset**: 2 exercícios consecutivos sem pausa
- **Cluster**: 4-6 reps com pausa 10-15s entre reps

## REGRAS:
- Iniciantes: NUNCA usar métodos avançados
- Aplicar apenas na última série do exercício
- Máximo 2-3 métodos por sessão

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 9: CARDIO
═══════════════════════════════════════════════════════════════════════════════

## Tipos:
- LISS: 20-40min, FC 50-65% máxima (caminhada, bike leve)
- MICT: 15-30min, FC 65-75% máxima (corrida moderada)
- HIIT: 10-20min, apenas intermediários/avançados

## Por Objetivo:
- EMAGRECIMENTO: 2-4x/semana, LISS/MICT preferencial
- HIPERTROFIA: máx 2x/semana, apenas LISS
- SAÚDE: 2-3x/semana, MICT

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 10: FORMATO DE SAÍDA JSON
═══════════════════════════════════════════════════════════════════════════════

Retorne APENAS um JSON válido com esta estrutura EXATA:

{
  "planName": "Nome do plano",
  "description": "Descrição personalizada",
  "weeklyFrequency": numero,
  "sessionDuration": "duração",
  "periodization": "linear | undulating | linear_undulating",
  "periodizationDescription": "Descrição da estratégia de periodização",
  "experienceLevel": "beginner/intermediate/advanced",
  "mainGoal": "objetivo",
  "weeklyVolumeStrategy": "Explicação da estratégia de volume",
  "workouts": [
    {
      "day": "Dia da semana",
      "name": "Nome do treino",
      "focus": "Foco principal",
      "muscleGroups": ["grupo1", "grupo2"],
      "estimatedDuration": "XX min",
      "warmup": {
        "description": "Aquecimento",
        "duration": "5-10 min",
        "exercises": ["exercício 1"]
      },
      "exercises": [
        {
          "order": 1,
          "name": "Nome DO CATÁLOGO",
          "equipment": "Equipamento",
          "muscleGroup": "Grupamento",
          "sets": 3,
          "reps": "10-12",
          "rest": "60s",
          "intensity": "RPE 7-8",
          "notes": "Observações técnicas",
          "isCompound": true,
          "alternatives": ["alternativa se lesão"]
        }
      ],
      "finisher": null,
      "cardio": null
    }
  ],
  "weeklyVolume": {
    "chest": X,
    "back": X,
    "scapular_belt": X,
    "shoulders": X,
    "biceps": X,
    "triceps": X,
    "quadriceps": X,
    "hamstrings": X,
    "glutes": X,
    "calves": X,
    "core": X
  },
  "progressionPlan": {
    "week1": "Foco semana 1",
    "week2": "Foco semana 2",
    "week3": "Foco semana 3",
    "week4": "Foco semana 4",
    "deloadWeek": "Semana de recuperação"
  },
  "adaptations": {
    "painAreas": [],
    "sleepStress": "",
    "focusAreas": []
  },
  "warnings": [],
  "motivationalMessage": "Mensagem com nome do usuário",
  "coachNotes": "Notas do treinador"
}

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 11: REGRAS CRÍTICAS FINAIS
═══════════════════════════════════════════════════════════════════════════════

## OBRIGATÓRIO:
1. Retorne APENAS o JSON, sem texto adicional
2. Use APENAS exercícios do CATÁLOGO fornecido
3. Respeite os RANGES DE VOLUME calculados
4. Inclua ALTERNATIVAS se houver lesão
5. VARIE os intervalos de descanso (não use só 90s)
6. Adapte instruções ao nível do usuário
7. weeklyVolume DEVE ter TODOS os grupos (incluindo scapular_belt)
8. Inclua PELO MENOS 1 exercício de Cintura Escapular
9. Volume de Costas >= Volume de Peitoral (se não há prioridade peitoral)
10. VERIFIQUE que total de séries × tempo/série ≤ tempo disponível
11. Se tempo exceder, REDUZA isoladores primeiro

## NUNCA:
- Prescreva saltos para dor em joelho/tornozelo
- Prescreva overhead para dor em ombro
- Use métodos avançados para iniciantes
- Ignore o tempo de sessão disponível
- Prescreva abaixo do MÍNIMO
- Prescreva acima do MÁXIMO
- Invente exercícios fora do catálogo
- Negligencie a Cintura Escapular
- Gere treinos que excedam o tempo disponível`;

// ═══════════════════════════════════════════════════════════════════════════════
//                          MAIN SERVER HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === AUTHENTICATION CHECK ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No valid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !LOVABLE_API_KEY) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("Authenticated user:", userId);

    // === RATE LIMITING ===
    const RATE_LIMIT_MAX_REQUESTS = 5;
    const RATE_LIMIT_WINDOW_HOURS = 1;

    const { data: rateLimitData, error: rateLimitError } = await supabase
      .rpc("check_rate_limit", {
        p_user_id: userId,
        p_endpoint: "generate-workout",
        p_max_requests: RATE_LIMIT_MAX_REQUESTS,
        p_window_hours: RATE_LIMIT_WINDOW_HOURS,
      });

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    } else if (rateLimitData && rateLimitData[0]) {
      const { allowed, current_count, remaining, reset_at } = rateLimitData[0];
      console.log(`Rate limit check: user=${userId}, count=${current_count}/${RATE_LIMIT_MAX_REQUESTS}, remaining=${remaining}`);
      
      if (!allowed) {
        const resetDate = new Date(reset_at);
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded",
            message: `Você atingiu o limite de ${RATE_LIMIT_MAX_REQUESTS} gerações de treino por hora. Tente novamente após ${resetDate.toLocaleTimeString("pt-BR")}.`,
            reset_at: reset_at,
            current_count: current_count,
            max_requests: RATE_LIMIT_MAX_REQUESTS,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "X-RateLimit-Limit": RATE_LIMIT_MAX_REQUESTS.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": reset_at,
            },
          }
        );
      }
    }

    // === INPUT VALIDATION ===
    const { userData } = await req.json();
    
    const validationResult = OnboardingSchema.safeParse(userData);
    if (!validationResult.success) {
      console.error("Validation errors:", validationResult.error.issues);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input data", 
          details: validationResult.error.issues 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validatedData = validationResult.data;

    // === FETCH EXERCISES FROM CATALOG ===
    const allowedLevels = getAllowedLevels(validatedData.experienceLevel || "beginner");
    
    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("name, muscle_group, movement_pattern, training_level, equipment")
      .in("training_level", allowedLevels);

    if (exercisesError) {
      throw new Error(`Failed to fetch exercises: ${exercisesError.message}`);
    }

    // === FILTER EXERCISES BY EQUIPMENT ===
    let filteredExercises = filterExercisesByEquipment(
      exercises || [],
      validatedData.exerciseTypes || []
    );
    console.log(`Exercise filtering: ${exercises?.length || 0} total -> ${filteredExercises.length} after equipment filter (prefs: ${validatedData.exerciseTypes?.join(', ') || 'all'})`);

    // === FILTER EXERCISES BY INJURIES ===
    const injuryResult = filterExercisesByInjuries(
      filteredExercises,
      validatedData.injuryAreas || []
    );
    filteredExercises = injuryResult.filtered;
    
    if (injuryResult.excludedCount > 0) {
      console.log(`Injury filtering: Excluded ${injuryResult.excludedCount} exercises. By area:`, injuryResult.excludedByArea);
    }

    // === BUILD USER PROMPT ===
    const userPrompt = buildUserPrompt(validatedData, filteredExercises);

    // === CALL AI ===
    console.log("Calling Lovable AI for user:", userId);
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    // === PARSE JSON RESPONSE ===
    let workoutPlan;
    try {
      workoutPlan = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      throw new Error("AI response is not valid JSON");
    }

    // === VALIDATE THE PLAN ===
    const validationWarnings = validateWorkoutPlan(
      workoutPlan,
      filteredExercises,
      {
        trainingDays: validatedData.trainingDays,
        injuryAreas: validatedData.injuryAreas || [],
        experienceLevel: validatedData.experienceLevel,
        goal: validatedData.goal,
        sessionDuration: validatedData.sessionDuration,
        sleepHours: validatedData.sleepHours,
        stressLevel: validatedData.stressLevel,
        bodyAreas: validatedData.bodyAreas || [],
      }
    );
    
    if (validationWarnings.errors.length > 0) {
      console.error("Workout plan validation ERRORS:", validationWarnings.errors);
    }
    
    if (validationWarnings.warnings.length > 0) {
      console.warn("Workout plan validation warnings:", validationWarnings.warnings);
    }

    console.log("Successfully generated workout plan for user:", userId);

    return new Response(
      JSON.stringify({ 
        plan: workoutPlan,
        validationErrors: validationWarnings.errors.length > 0 
          ? validationWarnings.errors 
          : undefined,
        validationWarnings: validationWarnings.warnings.length > 0 
          ? validationWarnings.warnings 
          : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating workout:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//                          HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getAllowedLevels(userLevel: string): string[] {
  switch (userLevel) {
    case "beginner":
      return ["Iniciante"];
    case "intermediate":
      return ["Iniciante", "Intermediário"];
    case "advanced":
      return ["Iniciante", "Intermediário", "Avançado", "Intermediário e Avançado", "Iniciante a Avançado"];
    default:
      return ["Iniciante"];
  }
}

function buildUserPrompt(userData: ValidatedUserData, exercises: Exercise[]): string {
  // Calculate BMI
  const heightM = (userData.height || 170) / 100;
  const weight = userData.weight || 70;
  const bmi = (weight / (heightM * heightM)).toFixed(1);
  
  let bmiCategory = "normal";
  if (parseFloat(bmi) < 18.5) bmiCategory = "abaixo do peso";
  else if (parseFloat(bmi) >= 25 && parseFloat(bmi) < 30) bmiCategory = "sobrepeso";
  else if (parseFloat(bmi) >= 30) bmiCategory = "obesidade";

  // Calculate volume ranges using NEW system
  const level = userData.experienceLevel || "beginner";
  const volumeRanges = calculateVolumeRanges({
    experienceLevel: level,
    goal: userData.goal,
    sessionDuration: userData.sessionDuration,
    trainingDaysCount: userData.trainingDays?.length || 3,
    sleepHours: userData.sleepHours,
    stressLevel: userData.stressLevel,
  });

  // Group exercises by muscle group
  const exercisesByMuscle: Record<string, Exercise[]> = {};
  exercises.forEach((ex) => {
    const group = ex.muscle_group || "Outros";
    if (!exercisesByMuscle[group]) {
      exercisesByMuscle[group] = [];
    }
    exercisesByMuscle[group].push(ex);
  });

  // Build exercise catalog string
  let catalogStr = "\n## CATÁLOGO DE EXERCÍCIOS DISPONÍVEIS:\n";
  Object.entries(exercisesByMuscle).forEach(([group, exList]) => {
    catalogStr += `\n### ${group}:\n`;
    exList.forEach((ex) => {
      catalogStr += `- ${ex.name} | Nível: ${ex.training_level} | Equipamento: ${ex.equipment || "N/A"}\n`;
    });
  });

  // Build health section
  let healthSection = "";
  if (userData.hasHealthConditions) {
    if (userData.injuryAreas && userData.injuryAreas.length > 0) {
      healthSection = `
## CONDIÇÕES DE SAÚDE E DOR
- Possui condições/lesões: SIM
- REGIÕES AFETADAS: ${userData.injuryAreas.map(getInjuryLabel).join(', ')}
${userData.injuryAreas.map(area => `
### ${getInjuryLabel(area).toUpperCase()}:
- ${getInjuryAdaptationRules(area)}
- OBRIGATÓRIO: Incluir alternativas em cada exercício`).join('\n')}
${userData.healthDescription ? `
- Descrição adicional: ${sanitizeForPrompt(userData.healthDescription)}` : ''}`;
    } else if (userData.healthDescription) {
      healthSection = `
## CONDIÇÕES DE SAÚDE E DOR
- Possui condições/lesões: SIM
- Descrição: ${sanitizeForPrompt(userData.healthDescription)}`;
    }
  } else {
    healthSection = `
## CONDIÇÕES DE SAÚDE E DOR
- Possui condições/lesões: NÃO
- Sem restrições`;
  }

  // Calculate periodization based on frequency and level
  const periodizationConfig = determinePeriodization({
    trainingDaysCount: userData.trainingDays?.length || 3,
    experienceLevel: level,
    goal: userData.goal,
  });

  // Build volume section with CALCULATED values
  const volumeSection = `
## 🎯 VOLUME CALCULADO PARA ESTE USUÁRIO

**Perfil**: ${getLevelLabel(userData.experienceLevel)} | ${getGoalShort(userData.goal)} | ${userData.sessionDuration || "45min"} | ${userData.trainingDays?.length || 3} dias/sem
**Split recomendado**: ${volumeRanges.recommendedSplit}
**Séries por treino**: ${volumeRanges.setsPerWorkout.min}-${volumeRanges.setsPerWorkout.max}

### FAIXAS DE VOLUME SEMANAL OBRIGATÓRIAS:
| Grupamento       | Mínimo | Máximo |
|------------------|--------|--------|
| Peitoral         | ${volumeRanges.large.min} | ${volumeRanges.large.max} |
| Costas           | ${volumeRanges.large.min} | ${volumeRanges.large.max} |
| Cintura Escapular| ${volumeRanges.medium.min} | ${volumeRanges.medium.max} |
| Quadríceps       | ${volumeRanges.large.min} | ${volumeRanges.large.max} |
| Isquiotibiais    | ${volumeRanges.large.min} | ${volumeRanges.large.max} |
| Glúteos          | ${volumeRanges.large.min} | ${volumeRanges.large.max} |
| Ombros           | ${volumeRanges.medium.min} | ${volumeRanges.medium.max} |
| Bíceps           | ${volumeRanges.small.min} | ${volumeRanges.small.max} |
| Tríceps          | ${volumeRanges.small.min} | ${volumeRanges.small.max} |
| Panturrilhas     | ${volumeRanges.small.min} | ${volumeRanges.small.max} |
| Core             | ${volumeRanges.small.min} | ${volumeRanges.small.max} |

### ⚠️ REGRAS CRÍTICAS:
- TODOS os grupamentos DEVEM estar DENTRO das faixas acima
- Cintura Escapular: OBRIGATÓRIO pelo menos 1 exercício (crucifixo inverso, remada aberta)
- Costas >= Peitoral em volume (equilíbrio postural)
- Se há área prioritária: pode aumentar até +30% apenas naquela área
- NUNCA reduzir outros grupos abaixo do mínimo
- O plano será VALIDADO contra estes limites`;

  // Build periodization section
  const periodizationSection = `
## 📈 PERIODIZAÇÃO DEFINIDA PARA ESTE USUÁRIO

**Tipo**: ${getPeriodizationLabel(periodizationConfig)}
**Descrição**: ${periodizationConfig.description}
**Padrão semanal**: ${periodizationConfig.weeklyPattern}

### REGRAS DE PROGRESSÃO:
${periodizationConfig.progressionRules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

### ⚠️ OBRIGATÓRIO NO JSON:
- Campo "periodization" deve ser: "${periodizationConfig.type}"
- Campo "progressionPlan" deve refletir as regras acima`;

  return `
═══════════════════════════════════════════════════════════════════════════════
                    DADOS DO USUÁRIO PARA PRESCRIÇÃO
═══════════════════════════════════════════════════════════════════════════════

## IDENTIFICAÇÃO
- Nome: ${sanitizeName(userData.name) || "Usuário"}
- Gênero: ${getGenderLabel(userData.gender)}
- Idade: ${userData.age || 30} anos
- Altura: ${userData.height || 170} cm
- Peso: ${userData.weight || 70} kg
- IMC: ${bmi} (${bmiCategory})

## OBJETIVO E PRAZO
- Objetivo: ${getGoalLabel(userData.goal)}
- Prazo: ${getTimeframeLabel(userData.timeframe)}

## DISPONIBILIDADE
- Dias por semana: ${userData.trainingDays?.length || 3} dias
- Dias específicos: ${userData.trainingDays?.map(getDayLabel).join(', ') || 'Flexível'}
- Duração por sessão: ${getSessionLabel(userData.sessionDuration)}

## PREFERÊNCIAS
- Tipos de exercício: ${userData.exerciseTypes?.join(', ') || 'Variado'}
- Aceita cardio: ${userData.includeCardio ? 'SIM' : 'NÃO'}
- Nível: ${getLevelLabel(userData.experienceLevel)}
- Preferência de variação: ${getVariationLabel(userData.variationPreference)}

## ÁREAS PRIORITÁRIAS
${userData.bodyAreas?.length > 0 
  ? `- Áreas para priorizar: ${userData.bodyAreas.join(', ')}\n- AÇÃO: Aumentar volume 20-30% APENAS nestas áreas` 
  : '- Distribuição equilibrada'}

${healthSection}

## RECUPERAÇÃO
- Sono: ${userData.sleepHours || "7-8"} horas
- Estresse: ${getStressLabel(userData.stressLevel)}
- Capacidade de recuperação: ${getRecoveryLabel(userData.sleepHours, userData.stressLevel)}

${volumeSection}

${periodizationSection}

${catalogStr}

═══════════════════════════════════════════════════════════════════════════════
                              INSTRUÇÕES FINAIS
═══════════════════════════════════════════════════════════════════════════════

Gere um plano de treino completo seguindo RIGOROSAMENTE:

1. Os RANGES DE VOLUME calculados acima (OBRIGATÓRIO)
2. A divisão "${volumeRanges.recommendedSplit}" para ${userData.trainingDays?.length || 3} dias/semana
3. ${volumeRanges.setsPerWorkout.min}-${volumeRanges.setsPerWorkout.max} séries por treino
4. A periodização "${periodizationConfig.type}" definida acima
5. TODAS as adaptações para condições de saúde
6. Priorização das áreas solicitadas (se houver)
7. USE APENAS EXERCÍCIOS DO CATÁLOGO
8. INCLUA ALTERNATIVAS se houver lesão
9. VARIE os intervalos de descanso CONFORME a faixa de repetições
10. weeklyVolume DEVE ter TODOS os grupos DENTRO da faixa
11. VERIFIQUE que total de séries × tempo/série ≤ tempo disponível
12. Se tempo exceder, REDUZA isoladores primeiro
13. progressionPlan DEVE refletir a periodização "${periodizationConfig.type}"`;
}

function getGenderLabel(gender: string | null): string {
  const labels: Record<string, string> = { female: "Feminino", male: "Masculino", other: "Outro" };
  return labels[gender || "other"] || "Não informado";
}

function getGoalLabel(goal: string | null): string {
  const labels: Record<string, string> = {
    weight_loss: "EMAGRECIMENTO - densidade alta, pausas curtas, reps 12-20",
    hypertrophy: "HIPERTROFIA - volume progressivo, reps 6-12",
    health: "SAÚDE - volume moderado, reps 10-15",
    performance: "PERFORMANCE - intensidade alta, reps 4-6",
  };
  return labels[goal || "health"] || "SAÚDE";
}

function getGoalShort(goal: string | null): string {
  const labels: Record<string, string> = {
    weight_loss: "Emagrecimento", hypertrophy: "Hipertrofia",
    health: "Saúde", performance: "Performance",
  };
  return labels[goal || "health"] || "Saúde";
}

function getTimeframeLabel(timeframe: string | null): string {
  const labels: Record<string, string> = {
    "3months": "3 meses - progressão acelerada",
    "6months": "6 meses - progressão moderada",
    "12months": "12 meses - progressão gradual",
  };
  return labels[timeframe || "6months"] || "6 meses";
}

function getDayLabel(day: string): string {
  const labels: Record<string, string> = {
    mon: "Segunda", tue: "Terça", wed: "Quarta",
    thu: "Quinta", fri: "Sexta", sat: "Sábado", sun: "Domingo",
  };
  return labels[day] || day;
}

function getSessionLabel(duration: string | null): string {
  const labels: Record<string, string> = {
    "30min": "30 min - 4-6 exercícios, supersets",
    "45min": "45 min - 5-7 exercícios",
    "60min": "60 min - 6-8 exercícios",
    "60plus": "60+ min - 7-10 exercícios",
  };
  return labels[duration || "45min"] || "45 min";
}

function getLevelLabel(level: string | null): string {
  const labels: Record<string, string> = {
    beginner: "INICIANTE - 70%+ máquinas, progressão linear",
    intermediate: "INTERMEDIÁRIO - 50% máquinas + 50% pesos livres",
    advanced: "AVANÇADO - pesos livres, métodos avançados",
  };
  return labels[level || "beginner"] || "INICIANTE";
}

function getVariationLabel(variation: string | null): string {
  const labels: Record<string, string> = {
    high: "ALTA - troca semanal de acessórios",
    moderate: "MODERADA - troca a cada 2 semanas",
    low: "BAIXA - treino fixo 4 semanas",
  };
  return labels[variation || "moderate"] || "MODERADA";
}

function getStressLabel(stress: string | null): string {
  const labels: Record<string, string> = {
    low: "BAIXO", moderate: "MODERADO", high: "ALTO - aplicar redução",
  };
  return labels[stress || "moderate"] || "MODERADO";
}

function getRecoveryLabel(sleepHours: string | null, stressLevel: string | null): string {
  if (hasLowRecovery(sleepHours, stressLevel)) {
    return "BAIXA - volume reduzido em 10%";
  }
  return "ADEQUADA";
}
