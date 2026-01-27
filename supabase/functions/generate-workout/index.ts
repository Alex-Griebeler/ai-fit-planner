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
  cardioTiming: z.enum(["post_workout", "separate_day", "ai_decides"]).nullable().optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).nullable(),
  splitPreference: z.enum(["fullbody", "push_pull_legs", "hybrid", "no_preference"]).nullable().optional(),
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
//                          ANÁLISE DE PADRÃO DE DIAS
// ═══════════════════════════════════════════════════════════════════════════════

interface DayPatternAnalysis {
  pattern: 'alternating' | 'consecutive' | 'mixed';
  consecutiveGroups: string[][];
  maxConsecutive: number;
  dayNames: string[];
}

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function analyzeDayPattern(trainingDays: string[]): DayPatternAnalysis {
  if (!trainingDays || trainingDays.length === 0) {
    return { pattern: 'alternating', consecutiveGroups: [], maxConsecutive: 0, dayNames: [] };
  }
  
  // Normalizar e ordenar dias
  const normalizedDays = trainingDays
    .map(d => d.toLowerCase())
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  
  // Detectar grupos consecutivos
  const consecutiveGroups: string[][] = [];
  let currentGroup: string[] = [];
  
  for (let i = 0; i < normalizedDays.length; i++) {
    const currentIdx = DAY_ORDER.indexOf(normalizedDays[i]);
    const prevIdx = i > 0 ? DAY_ORDER.indexOf(normalizedDays[i - 1]) : -2;
    
    if (currentIdx === prevIdx + 1) {
      if (currentGroup.length === 0) {
        currentGroup.push(normalizedDays[i - 1]);
      }
      currentGroup.push(normalizedDays[i]);
    } else {
      if (currentGroup.length > 0) {
        consecutiveGroups.push([...currentGroup]);
        currentGroup = [];
      }
    }
  }
  if (currentGroup.length > 0) {
    consecutiveGroups.push(currentGroup);
  }
  
  const maxConsecutive = consecutiveGroups.reduce((max, g) => Math.max(max, g.length), 0);
  
  // Determinar padrão
  let pattern: 'alternating' | 'consecutive' | 'mixed';
  if (maxConsecutive === 0) {
    pattern = 'alternating';
  } else if (maxConsecutive === normalizedDays.length) {
    pattern = 'consecutive';
  } else {
    pattern = 'mixed';
  }
  
  return {
    pattern,
    consecutiveGroups,
    maxConsecutive,
    dayNames: normalizedDays
  };
}

// Regras FIXAS de split baseadas no padrão de dias
interface SplitRule {
  split: string;
  description: string;
  dayStructure: string[];
  specialInstruction?: string;
}

const SPLIT_RULES_BY_PATTERN: Record<string, Record<string, SplitRule>> = {
  // 3 dias/semana
  "3": {
    alternating: {
      split: "Full Body 3x",
      description: "Treino completo cada dia, variando ênfase",
      dayStructure: ["Full Body A", "Full Body B", "Full Body C"]
    },
    consecutive: {
      split: "A/B/C Split (Push/Pull/Legs)",
      description: "Push/Pull/Legs para evitar sobreposição muscular em dias seguidos",
      dayStructure: ["Push (Peito/Ombro/Tríceps)", "Pull (Costas/Bíceps)", "Legs (Pernas/Core)"]
    },
    mixed: {
      split: "Full Body + A/B",
      description: "Full Body no dia isolado, A/B nos dias consecutivos",
      dayStructure: ["Full Body", "Upper", "Lower"]
    }
  },
  // 4 dias/semana
  "4": {
    alternating: {
      split: "Upper/Lower 2x",
      description: "Clássico Upper/Lower com 2 frequências por grupamento",
      dayStructure: ["Upper A", "Lower A", "Upper B", "Lower B"]
    },
    consecutive: {
      split: "Upper/Lower 2x (adaptado)",
      description: "Alternar Upper/Lower mesmo em dias seguidos - sem sobreposição",
      dayStructure: ["Upper A", "Lower A", "Upper B", "Lower B"]
    },
    mixed: {
      split: "Upper/Lower 2x",
      description: "Upper/Lower adaptado ao padrão misto",
      dayStructure: ["Upper A", "Lower A", "Upper B", "Lower B"]
    }
  },
  // 5 dias/semana
  "5": {
    alternating: {
      split: "Híbrido ULPPL",
      description: "Upper-Lower-Push-Pull-Legs",
      dayStructure: ["Upper", "Lower", "Push", "Pull", "Legs"]
    },
    consecutive: {
      split: "Híbrido ULPPL",
      description: "Organizado para minimizar sobreposição em dias seguidos",
      dayStructure: ["Upper", "Lower", "Push", "Pull", "Legs"]
    },
    mixed: {
      split: "Híbrido ULPPL",
      description: "Upper-Lower-Push-Pull-Legs adaptado",
      dayStructure: ["Upper", "Lower", "Push", "Pull", "Legs"]
    }
  },
  // 6 dias/semana
  "6": {
    alternating: {
      split: "PPL 2x",
      description: "Push/Pull/Legs repetido 2x na semana",
      dayStructure: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"]
    },
    consecutive: {
      split: "PPL 2x",
      description: "Push/Pull/Legs organizado para evitar mesmo grupo em dias seguidos",
      dayStructure: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"]
    },
    mixed: {
      split: "PPL 2x",
      description: "Push/Pull/Legs 2x",
      dayStructure: ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"]
    }
  }
};

function getPatternLabel(pattern: 'alternating' | 'consecutive' | 'mixed'): string {
  const labels = {
    alternating: 'ALTERNADOS',
    consecutive: 'CONSECUTIVOS',
    mixed: 'MISTO'
  };
  return labels[pattern];
}

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

const SESSION_TIME_TOLERANCE = 0.15; // 15% de tolerância

// ═══════════════════════════════════════════════════════════════════════════════
//                          AQUECIMENTO POR DURAÇÃO DE SESSÃO
// ═══════════════════════════════════════════════════════════════════════════════

interface WarmupStrategy {
  type: "specific" | "general_plus_specific";
  sets: number;
  intensity: string;
  timeMinutes: number;
  description: string;
}

const WARMUP_STRATEGY: Record<string, WarmupStrategy> = {
  "30min": {
    type: "specific",
    sets: 1,
    intensity: "60-70% da carga do primeiro exercício",
    timeMinutes: 2,
    description: "1 série leve do primeiro exercício (60-70% carga)"
  },
  "45min": {
    type: "specific", 
    sets: 2,
    intensity: "60-70% da carga",
    timeMinutes: 3,
    description: "1-2 séries leves do primeiro exercício"
  },
  "60min": {
    type: "general_plus_specific",
    sets: 2,
    intensity: "progressivo 50-70%",
    timeMinutes: 5,
    description: "Aquecimento geral (3min) + específico (2min)"
  },
  "60plus": {
    type: "general_plus_specific",
    sets: 2,
    intensity: "progressivo 50-70%",
    timeMinutes: 5,
    description: "Aquecimento geral + específico completo"
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//                          ESTRATÉGIA DE DENSIDADE (TEMPO LIMITADO)
// ═══════════════════════════════════════════════════════════════════════════════

interface DensityStrategy {
  enabled: boolean;
  reducedRestForIsolation: boolean;
  allowIsolation: boolean;
  prioritizeLargeGroups: boolean;
  warmupStrategy: WarmupStrategy;
  targetSetsPerSession: { min: number; max: number };
}

function calculateDensityStrategy(params: {
  sessionDuration: string;
  goal: string | null;
  experienceLevel: string;
  focusAreas: string[];
}): DensityStrategy {
  const { sessionDuration, goal, experienceLevel, focusAreas } = params;
  const isShortSession = sessionDuration === "30min";
  const isMediumSession = sessionDuration === "45min";
  const isVolumeIntensive = goal === "hypertrophy" || goal === "weight_loss";
  
  const needsHighDensity = (isShortSession || isMediumSession) && isVolumeIntensive;
  
  // REGRA CHAVE: Isolados em 30min só se usuário pediu áreas específicas
  const userWantsIsolation = focusAreas.some(area => 
    ["arms", "biceps", "triceps", "braços", "bíceps", "tríceps", "shoulders", "ombros"].includes(area.toLowerCase())
  );
  
  // Para 30min: isolados APENAS se explicitamente pedido
  // Para 45min+: mais flexível
  const allowIsolation = isShortSession ? userWantsIsolation : true;
  
  // Capacidade realista por sessão com descanso reduzido
  const sessionCapacity: Record<string, { min: number; max: number }> = {
    "30min": { min: 12, max: 14 },
    "45min": { min: 18, max: 22 },
    "60min": { min: 24, max: 28 },
    "60plus": { min: 28, max: 34 }
  };
  
  const warmupStrategy = WARMUP_STRATEGY[sessionDuration] || WARMUP_STRATEGY["45min"];
  
  return {
    enabled: needsHighDensity,
    reducedRestForIsolation: needsHighDensity,
    allowIsolation,
    prioritizeLargeGroups: needsHighDensity && !userWantsIsolation,
    warmupStrategy,
    targetSetsPerSession: sessionCapacity[sessionDuration] || sessionCapacity["45min"]
  };
}

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
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VOLUME MÍNIMO POR GRUPAMENTO - ALINHADO COM DOCUMENTO TÉCNICO
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // GRUPOS GRANDES (chest, back, quadriceps, hamstrings, glutes):
  // - Hipertrofia: MÍNIMO 10 séries/semana (documento: "11+ prioridade máxima")
  // - Emagrecimento: MÍNIMO 8 séries/semana
  // - Saúde: MÍNIMO 6 séries/semana
  // - Performance: MÍNIMO 8 séries/semana
  //
  // GRUPOS MÉDIOS (shoulders, scapular_belt):
  // - Todos objetivos: MÍNIMO 6 séries/semana (documento: "8-10 prioridade média")
  // - Cintura escapular é OBRIGATÓRIA com no mínimo 1 exercício/semana
  //
  // GRUPOS PEQUENOS (biceps, triceps, calves, core):
  // - Hipertrofia/Performance: MÍNIMO 6 séries/semana 
  // - Saúde/Emagrecimento: MÍNIMO 4 séries/semana (podem ser cobertos por compostos)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Mínimos absolutos por objetivo (não depende de cálculo proporcional)
  const goalMinVolumes: Record<string, { large: number; medium: number; small: number }> = {
    hypertrophy:  { large: 10, medium: 6, small: 6 },
    weight_loss:  { large: 8,  medium: 6, small: 4 },
    health:       { large: 6,  medium: 4, small: 4 },
    performance:  { large: 8,  medium: 6, small: 6 },
  };
  
  const minVolumes = goalMinVolumes[goal || "health"] || goalMinVolumes.health;
  
  // Calcular range proporcional (máximo é flexível, mínimo é rígido)
  return {
    large: { 
      min: Math.max(minVolumes.large, finalMin), 
      max: finalMax 
    },
    medium: { 
      min: Math.max(minVolumes.medium, Math.round(finalMin * 0.60)), 
      max: Math.round(finalMax * 0.80) 
    },
    small: { 
      min: Math.max(minVolumes.small, Math.round(finalMin * 0.40)), 
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
  method: z.string().optional(),
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
  
  // 5b. VALIDATE BACK vs CHEST RATIO (Pull/Push balance) - REGRA: 1.1:1 a 1.25:1
  const backVolume = weeklyVolume["back"] || 0;
  const chestVolume = weeklyVolume["chest"] || 0;
  
  // Check if user has chest as priority area
  const chestIsPriority = (userData.bodyAreas || []).some(area => 
    ["peitoral", "peito", "chest"].includes(area.toLowerCase())
  );
  
  // Definir proporções alvo conforme documento técnico
  // - Se Peitoral é prioridade: proporção 1:1 é aceitável
  // - Caso contrário: Costas deve ter 1.1x a 1.25x o volume de Peitoral
  const MIN_BACK_TO_CHEST_RATIO = 1.10;
  const MAX_BACK_TO_CHEST_RATIO = 1.25;
  const PRIORITY_RATIO = 1.00; // Quando peitoral é prioridade, 1:1 é OK
  
  if (backVolume > 0 && chestVolume > 0) {
    const actualRatio = backVolume / chestVolume;
    
    if (chestIsPriority) {
      // Se peitoral é prioridade, proporção 1:1 é aceitável (com tolerância)
      if (actualRatio < PRIORITY_RATIO * 0.9) {
        warnings.push(
          `Proporção Costas/Peitoral (${actualRatio.toFixed(2)}:1) abaixo do mínimo. ` +
          `Costas: ${backVolume} | Peitoral: ${chestVolume}. Mínimo esperado: 1:1`
        );
      }
    } else {
      // Se peitoral NÃO é prioridade, aplicar regra 1.1:1 a 1.25:1
      if (actualRatio < MIN_BACK_TO_CHEST_RATIO) {
        const minBackNeeded = Math.ceil(chestVolume * MIN_BACK_TO_CHEST_RATIO);
        warnings.push(
          `Proporção Costas/Peitoral (${actualRatio.toFixed(2)}:1) abaixo do mínimo (1.1:1). ` +
          `Costas: ${backVolume} séries | Peitoral: ${chestVolume} séries. ` +
          `Aumentar Costas para pelo menos ${minBackNeeded} séries.`
        );
      } else if (actualRatio > MAX_BACK_TO_CHEST_RATIO * 1.15) {
        // Tolerância de 15% acima do máximo
        warnings.push(
          `Proporção Costas/Peitoral (${actualRatio.toFixed(2)}:1) muito alta (máximo: 1.25:1). ` +
          `Costas: ${backVolume} séries | Peitoral: ${chestVolume} séries. ` +
          `Considerar equilibrar volumes.`
        );
      }
    }
    
    // Log para debug
    console.log(`Back/Chest ratio validation - Back: ${backVolume}, Chest: ${chestVolume}, Ratio: ${actualRatio.toFixed(2)}:1, ChestPriority: ${chestIsPriority}`);
  } else if (backVolume === 0 && chestVolume > 0) {
    errors.push(`Volume de Costas não pode ser zero quando Peitoral tem ${chestVolume} séries`);
  } else if (chestVolume === 0 && backVolume > 0) {
    errors.push(`Volume de Peitoral não pode ser zero quando Costas tem ${backVolume} séries`);
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
  const warmupMinutes = WARMUP_STRATEGY[sessionDurationKey]?.timeMinutes || 5;
  const availableMinutes = maxMinutes - warmupMinutes;
  const timePerSet = TIME_PER_SET_BY_GOAL[userData.goal || "health"];
  const expectedSetsRange = SESSION_SETS_PER_WORKOUT[sessionDurationKey];

  for (const workout of plan.workouts || []) {
    const totalSets = workout.exercises?.reduce(
      (sum: number, ex: any) => sum + (ex.sets || 0), 0
    ) || 0;
    
    const estimatedMinutes = Math.round((totalSets * timePerSet) / 60);
    const totalSessionMinutes = estimatedMinutes + warmupMinutes;
    
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

// Calculate actual weekly volume from exercises (not from AI's declared values)
function calculateActualWeeklyVolume(plan: any): Record<string, number> {
  const volumeByMuscle: Record<string, number> = {};
  
  // Normalize muscle group names to internal keys
  const normalizeGroup = (group: string): string => {
    const normalized = group.toLowerCase().trim();
    
    const mapping: Record<string, string> = {
      'peito': 'chest',
      'peitoral': 'chest',
      'chest': 'chest',
      'costas': 'back',
      'dorsal': 'back',
      'back': 'back',
      'ombro': 'shoulders',
      'ombros': 'shoulders',
      'deltoides': 'shoulders',
      'shoulders': 'shoulders',
      'biceps': 'biceps',
      'bíceps': 'biceps',
      'triceps': 'triceps',
      'tríceps': 'triceps',
      'quadriceps': 'quadriceps',
      'quadríceps': 'quadriceps',
      'posterior': 'hamstrings',
      'posteriores': 'hamstrings',
      'isquiotibiais': 'hamstrings',
      'hamstrings': 'hamstrings',
      'gluteos': 'glutes',
      'glúteos': 'glutes',
      'glutes': 'glutes',
      'panturrilha': 'calves',
      'panturrilhas': 'calves',
      'calves': 'calves',
      'abdomen': 'core',
      'abdominal': 'core',
      'lombar': 'core',
      'lower_back': 'core',
      'core': 'core',
      'escapular': 'scapular_belt',
      'escapulares': 'scapular_belt',
      'cintura_escapular': 'scapular_belt',
      'scapular_belt': 'scapular_belt',
    };
    
    return mapping[normalized] || normalized;
  };
  
  // Sum sets from all workouts
  for (const workout of plan.workouts || []) {
    for (const exercise of workout.exercises || []) {
      const muscleGroup = normalizeGroup(exercise.muscleGroup || '');
      const sets = exercise.sets || 0;
      
      if (muscleGroup && sets > 0) {
        volumeByMuscle[muscleGroup] = (volumeByMuscle[muscleGroup] || 0) + sets;
      }
    }
  }
  
  return volumeByMuscle;
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

## FORMATO DE INTENSIDADE: RR (Repetições de Reserva)

IMPORTANTE: O campo "intensity" DEVE usar o formato "X-Y RR" (Repetições de Reserva).
RR = quantas repetições você PODERIA fazer além das prescritas antes de falhar.

Exemplos:
- "1-2 RR" = parar 1-2 reps antes da falha (alta intensidade)
- "2-3 RR" = parar 2-3 reps antes da falha (moderado-alta)
- "3-4 RR" = parar 3-4 reps antes da falha (moderado)

NUNCA use RPE ou porcentagem de 1RM no campo intensity. USE APENAS formato RR.

## Faixas de Repetições por Objetivo:

### HIPERTROFIA (documento técnico):
| Faixa        | Reps     | RR        | Descanso    | Quando Usar |
|--------------|----------|-----------|-------------|-------------|
| Força-Hipert | 6-8      | 1-2 RR    | 2-3 min     | Compostos principais, avançados |
| Hipertrofia  | 8-12     | 2-3 RR    | 90-120s     | Compostos e isoladores primários |
| Metabólico   | 12-15    | 2-4 RR    | 60-90s      | Isoladores, acabamento |
| Alto Rep     | 15-20    | 3-4 RR    | 45-60s      | Panturrilhas, finalizadores |

### FORÇA (avançados - apenas se objetivo = performance):
| Faixa        | Reps     | RR        | Descanso    |
|--------------|----------|-----------|-------------|
| Força Máxima | 2-4      | 1-2 RR    | 3-5 min     |
| Força-Hipert | 4-6      | 1-2 RR    | 2-4 min     |

### EMAGRECIMENTO:
| Faixa        | Reps     | RR        | Descanso    |
|--------------|----------|-----------|-------------|
| Circuito     | 12-15    | 3-4 RR    | 30-45s      |
| Metabólico   | 15-20    | 3-5 RR    | 30-60s      |

### SAÚDE:
| Faixa        | Reps     | RR        | Descanso    |
|--------------|----------|-----------|-------------|
| Geral        | 10-15    | 3-4 RR    | 45-75s      |

### INICIANTES:
- SEMPRE usar 3-4 RR (nunca treinar até falha)
- Foco em técnica, não em intensidade máxima

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

## SPLITS AUTO-OTIMIZADOS (sem conflitos naturais):
- Upper/Lower 4x
- Híbrido 5x
- PPL 6x

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 3.2: DISTRIBUIÇÃO DE ESTÍMULOS POR DIA
═══════════════════════════════════════════════════════════════════════════════

## REGRA FUNDAMENTAL:
O volume semanal TOTAL por grupamento é o que importa para hipertrofia.
Porém, PREFERIR espaçar estímulos quando possível para otimizar recuperação.

## REGRAS POR PADRÃO DE DIAS:

### DIAS ALTERNADOS (ex: Seg/Qua/Sex):
- Qualquer split é adequado
- Ideal para Full Body, Upper/Lower, Push/Pull
- Recuperação natural de 48-72h entre sessões

### DIAS CONSECUTIVOS (ex: Seg/Ter/Qua):
- OBRIGATÓRIO: Usar split que evite mesmo grupamento PRINCIPAL em dias seguidos
- Para 3 dias consecutivos: USAR A/B/C (Push/Pull/Legs) - SEM exceção
- Para 4+ dias consecutivos: Alternar Upper/Lower ou PPL
- Grupamentos secundários/acessórios PODEM aparecer em dias seguidos

### DIAS MISTOS (ex: Seg/Ter/Qui):
- Adaptar split considerando onde estão os dias consecutivos
- Nos dias consecutivos: aplicar regra de não-sobreposição
- Dia(s) isolado(s): pode ser Full Body ou complementar

## REGRA LOMBAR (lower_back):
- Para fins de contagem de volume, lombar INTEGRA o grupo "core"
- Exercícios de lombar (Hiperextensão, Good Morning) contam como séries de CORE
- Se usuário tem lesão em "lower_back": NÃO prescrever exercícios de fortalecimento lombar
- weeklyVolume.core = abdominais + oblíquos + lombar

## EXEMPLOS DE ORGANIZAÇÃO PARA DIAS CONSECUTIVOS:
- ✅ Seg=Peito/Tríceps → Ter=Costas/Bíceps → Qua=Pernas (sem sobreposição principal)
- ✅ Seg=Upper → Ter=Lower → Qua=Upper (mesmo split, grupos diferentes)
- ⚠️ EVITAR: Seg=Peito → Ter=Ombro (tríceps usado em ambos como sinergista)

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 3.1: ESTRATÉGIAS PARA TEMPO LIMITADO (30-45min)
═══════════════════════════════════════════════════════════════════════════════

## AQUECIMENTO ESPECÍFICO (sessões curtas)
Para sessões de 30-45min, o aquecimento deve ser ESPECÍFICO:
- 1-2 séries do PRIMEIRO EXERCÍCIO com 60-70% da carga
- NÃO incluir aquecimento geral de 5 minutos
- Tempo total: 2-3 minutos máximo

## REGRA CRÍTICA: ISOLADOS EM 30 MINUTOS
Para sessões de 30 minutos, exercícios isolados SÓ são permitidos quando:
- O usuário selecionou "Braços" como área de foco no onboarding
- O usuário selecionou "Ombros" como área de foco no onboarding

Se o usuário NÃO selecionou essas áreas → APENAS COMPOSTOS
O trabalho indireto de compostos é SUFICIENTE para grupos pequenos.

## ESTRATÉGIA: DESCANSO ESCALONADO
| Tipo de Exercício      | Descanso Padrão | Tempo Limitado |
|------------------------|-----------------|----------------|
| Composto principal     | 90-120s         | 90s (manter)   |
| Composto secundário    | 90s             | 60-75s         |
| Isolador (se permitido)| 60-90s          | 45-60s         |

## PRIORIZAÇÃO DE GRANDES GRUPOS (sem preferência específica)
Quando tempo é limitado e usuário NÃO selecionou áreas de foco:

**PRIORIDADE MÁXIMA (manter 11+ séries/semana):**
- Peito, Costas, Quadríceps, Glúteos

**PRIORIDADE MÉDIA (8-10 séries/semana):**
- Ombros, Isquiotibiais, Core

**SEM ISOLADOS (trabalho indireto):**
- Bíceps: coberto por remadas e puxadas
- Tríceps: coberto por supino e desenvolvimento
- Panturrilha: coberto por agachamentos e leg press

## CAPACIDADE REALISTA POR SESSÃO:
| Duração | Aquecimento   | Séries/Sessão | Com Descanso Reduzido |
|---------|---------------|---------------|----------------------|
| 30min   | 2min (espec.) | 10-12         | 12-14                |
| 45min   | 3min (espec.) | 16-18         | 18-22                |
| 60min   | 5min (geral)  | 22-24         | 24-28                |
| 60+min  | 5min (geral)  | 28-32         | 30-36                |

## EXEMPLO TREINO 30min SEM ISOLADOS (Hipertrofia, 3x/semana):
Aquecimento: 1 série leve de Supino (60-70% carga) [2min]

**TREINO A (Push):**
1. Supino Reto: 4x10 (90s)
2. Desenvolvimento: 3x10 (75s)
3. Crucifixo Inclinado: 3x12 (60s)
= 10 séries, ~25min

**TREINO B (Pull):**
1. Remada Curvada: 4x10 (90s)
2. Puxada Frontal: 3x10 (75s)
3. Face Pull: 3x15 (60s)
= 10 séries, ~25min

**TREINO C (Legs):**
1. Agachamento: 4x10 (90s)
2. Leg Press: 3x12 (75s)
3. Stiff: 3x10 (60s)
= 10 séries, ~25min

## EXEMPLO TREINO 30min COM ISOLADOS (usuário pediu "Braços"):
Aquecimento: 1 série leve de Supino (60-70% carga) [2min]

**TREINO A (Push + Tríceps):**
1. Supino Reto: 3x10 (90s)
2. Desenvolvimento: 3x10 (75s)
3. Tríceps Pulley: 3x12 (45s)
= 9 séries, ~23min

**TREINO B (Pull + Bíceps):**
1. Remada Curvada: 3x10 (90s)
2. Puxada Frontal: 3x10 (75s)
3. Rosca Direta: 3x12 (45s)
= 9 séries, ~23min

## VERIFICAÇÃO OBRIGATÓRIA ANTES DE FINALIZAR CADA TREINO:
1. Somar TODAS as séries do treino
2. Multiplicar pelo tempo/série do objetivo
3. Adicionar tempo de aquecimento (2-5min conforme duração)
4. Verificar se ≤ tempo disponível

## SE ULTRAPASSAR O TEMPO:
1. PRIMEIRO: Reduzir séries dos isoladores (de 4→3, de 3→2)
2. DEPOIS: Remover exercícios isoladores menos importantes
3. Se 30min SEM preferência por braços: REMOVER isolados completamente
4. NUNCA: Reduzir compostos principais abaixo de 3 séries

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
                         SEÇÃO 7.1: VARIAÇÃO DE EXERCÍCIOS
═══════════════════════════════════════════════════════════════════════════════

## DEFINIÇÕES:
- **Exercícios BASE**: Multiarticulares principais (Supino, Agachamento, Remada, etc.)
- **Exercícios ACESSÓRIOS**: Isoladores e variações secundárias

## NÍVEIS DE VARIAÇÃO:

### ALTA VARIAÇÃO (variationPreference = high):
- Exercícios ACESSÓRIOS: Trocar a cada SEMANA
- Exercícios BASE: Manter 2-3 semanas, depois variar angulação/equipamento
- Dentro da mesma semana: Usar variações diferentes do mesmo padrão
  - Ex: Supino Reto (Dia A) → Supino Inclinado (Dia B) → Crucifixo (Dia C)
- Priorizar catálogo diverso de exercícios para evitar monotonia
- progressionPlan DEVE indicar troca semanal de acessórios

### MODERADA (variationPreference = moderate):
- Exercícios ACESSÓRIOS: Trocar a cada 2 SEMANAS
- Exercícios BASE: Manter 3-4 semanas
- Dentro da mesma semana: Pode repetir exercícios entre dias diferentes
- progressionPlan DEVE indicar troca quinzenal de acessórios

### BAIXA VARIAÇÃO (variationPreference = low):
- Exercícios BASE E ACESSÓRIOS: Manter 4 semanas mínimo
- Dentro da mesma semana: Repetir os mesmos exercícios é aceitável
- Foco em progressão de carga, não em variação de estímulo
- progressionPlan DEVE focar em progressão de carga/volume

## REGRA ESPECIAL: VARIEDADE MÁXIMA (splitPreference = no_preference)

Quando o usuário seleciona "Sem Preferência" em 3 dias de treino:
- USAR Full Body 3x com regra CRÍTICA:
- **NENHUM EXERCÍCIO pode ser repetido durante a semana inteira**
- Cada dia (A, B, C) DEVE usar exercícios DIFERENTES para o mesmo grupamento
- Exemplo para Peitoral:
  - Dia A: Supino Reto com Barra
  - Dia B: Supino Inclinado com Halteres
  - Dia C: Crucifixo na Máquina
- Esta regra SOBREPÕE a preferência de variação normal
- Objetivo: Maximizar variedade de estímulos em 3 treinos

## APLICAÇÃO NO JSON:

O campo "notes" de cada exercício pode incluir:
- "Manter por X semanas" (para base)
- "Trocar após Xª semana por [alternativa]" (para acessórios)

O campo progressionPlan DEVE refletir a estratégia de variação:
- week1: "Semana base - aprender movimentos"
- week2: "Manter exercícios, aumentar carga" ou "Trocar acessórios"
- etc.

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

## Tipos de Cardio (SEMPRE usar estes nomes):
- LISS: Cardio de baixa intensidade e longa duração
  - Duração: 20-40min
  - Intensidade: FC 50-65% da máxima
  - Exemplos: Caminhada, bike leve, elíptico leve
  - Indicação: Todos os níveis, ideal para hipertrofia

- MICT: Cardio de intensidade moderada contínuo  
  - Duração: 15-30min
  - Intensidade: FC 65-75% da máxima
  - Exemplos: Corrida leve, bike moderada, natação
  - Indicação: Intermediários+, saúde geral

- HIIT: Cardio intervalado de alta intensidade
  - Duração: 10-20min
  - Intensidade: Séries intensas com descanso
  - Exemplos: Sprints, burpees, battle ropes
  - Indicação: APENAS intermediários/avançados

## Prescrição por Objetivo:
- EMAGRECIMENTO: 2-4x/semana, LISS ou MICT preferencial
- HIPERTROFIA: máx 2x/semana, APENAS LISS (não interfere na recuperação)
- SAÚDE: 2-3x/semana, MICT ideal
- PERFORMANCE: conforme esporte específico

## Estrutura do campo "cardio" no JSON:
"cardio": {
  "type": "LISS" | "MICT" | "HIIT",
  "duration": "20 min",
  "intensity": "FC 50-65% máx" | "Leve" | "Moderado" | "Intenso",
  "description": "Caminhada em esteira ou bike ergométrica em ritmo confortável",
  "notes": "Mantenha uma conversa leve durante o exercício para garantir intensidade correta"
}

## IMPORTANTE para cardio:
- O campo "description" DEVE explicar claramente o que fazer
- Use linguagem simples e acessível
- Inclua exemplos práticos de execução
- Se não houver cardio, use: "cardio": null

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
      "focus": "Grupos musculares principais separados por ' • ' (ex: 'Peitoral • Ombros • Tríceps')",
      "muscleGroups": ["Peitoral", "Ombros", "Tríceps"],
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
          "intensity": "2-3 RR",
          "notes": "Observações técnicas",
          "isCompound": true,
          "alternatives": ["alternativa se lesão"]
        }
      ],
      "finisher": null,
      "cardio": {
        "type": "LISS",
        "duration": "20 min",
        "intensity": "FC 50-65% máx",
        "description": "Caminhada em esteira ou bike em ritmo leve e constante",
        "notes": "Você deve conseguir conversar normalmente durante o exercício"
      }
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

## IDIOMA OBRIGATÓRIO (PT-BR):
- Todos os campos de texto (planName, description, notes, muscleGroups) DEVEM ser em PORTUGUÊS BRASILEIRO
- muscleGroups DEVE usar EXATAMENTE estes nomes em português:
  - Peitoral, Costas, Ombros, Bíceps, Tríceps, Quadríceps, Posteriores, Glúteos, Panturrilhas, Core, Cintura Escapular
- NUNCA use nomes em inglês (chest, back, shoulders, etc.) no campo muscleGroups

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
12. Se splitPreference = "no_preference": ZERO exercícios repetidos na semana
13. Aplique estratégia de variação conforme preferência do usuário (alta/moderada/baixa)
14. O campo "focus" DEVE listar os grupos musculares principais separados por " • " (ex: "Peitoral • Ombros • Tríceps"), NÃO o tipo de estímulo
15. O campo "planName" DEVE ser simples e amigável. NUNCA use siglas técnicas como ULPPL, PPL, ABC, PHUL. Use formatos como "Plano X Dias - Objetivo" (ex: "Plano 5 Dias - Hipertrofia")

## NUNCA:
- Prescreva saltos para dor em joelho/tornozelo
- Prescreva overhead para dor em ombro
- Use métodos avançados para iniciantes
- Ignore o tempo de sessão disponível
- Prescreva abaixo do MÍNIMO
- Prescreva acima do MÁXIMO
- Invente exercícios fora do catálogo
- Negligencie a Cintura Escapular
- Gere treinos que excedam o tempo disponível
- Use muscleGroups em inglês`;

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
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        p_user_id: userId,
        p_endpoint: 'generate-workout',
        p_max_requests: 5,
        p_window_hours: 1
      });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      return new Response(
        JSON.stringify({ error: 'Rate limit check failed' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!rateLimitData?.[0]?.allowed) {
      console.log(`Rate limit exceeded for user ${userId}`);
      return new Response(
        JSON.stringify({ 
          error: 'Limite de gerações excedido. Tente novamente mais tarde.',
          reset_at: rateLimitData?.[0]?.reset_at,
          remaining: 0
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Rate limit check passed: ${rateLimitData[0].remaining} requests remaining`);

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

    // === FETCH USER HISTORY FOR LEARNING CONTEXT V2 ===
    let learningContext = "";
    let learningContextV2: LearningContextV2 | null = null;
    const plannedFrequency = validatedData.trainingDays?.length || 3;
    
    try {
      // 1. Fetch last 10 completed sessions for RPE and completion analysis
      const { data: recentSessions } = await supabase
        .from('workout_sessions')
        .select('perceived_effort, completed_sets, total_sets, completed_at, duration_minutes')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10);

      // 2. Fetch load progression history
      const { data: loadHistory } = await supabase
        .from('exercise_loads')
        .select('exercise_name, load_value, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      // 3. Fetch last rated plan (if exists)
      const { data: lastRatedPlan } = await supabase
        .from('workout_plans')
        .select('plan_name, user_rating, rating_notes, rated_at')
        .eq('user_id', userId)
        .not('user_rating', 'is', null)
        .order('rated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 4. Build Learning Context V2 if we have data
      if (recentSessions && recentSessions.length > 0) {
        learningContextV2 = buildLearningContextV2(
          recentSessions, 
          loadHistory || [], 
          plannedFrequency, 
          lastRatedPlan
        );
        learningContext = learningContextV2.promptContext;
        
        console.log(`Learning Context V2 built:`, {
          sessions: learningContextV2.metrics.sessionsAnalyzed,
          avgRpe: learningContextV2.metrics.avgRpe,
          completionRate: learningContextV2.metrics.completionRate,
          actualFrequency: learningContextV2.metrics.actualFrequency,
          volumeMultiplier: learningContextV2.adjustments.volumeMultiplier,
          confidence: learningContextV2.adjustments.confidenceScore,
          canApply: learningContextV2.guardrails.canApplyAdjustments,
        });
        
        // Log to database for analysis (async, non-blocking)
        supabase
          .from('learning_context_logs')
          .insert({
            user_id: userId,
            sessions_analyzed: learningContextV2.metrics.sessionsAnalyzed,
            avg_rpe: learningContextV2.metrics.avgRpe,
            rpe_std_dev: learningContextV2.metrics.rpeStdDev,
            completion_rate: learningContextV2.metrics.completionRate ? learningContextV2.metrics.completionRate * 100 : null,
            avg_session_duration: learningContextV2.metrics.avgSessionDuration,
            actual_frequency: learningContextV2.metrics.actualFrequency,
            planned_frequency: learningContextV2.metrics.plannedFrequency,
            volume_multiplier: learningContextV2.adjustments.volumeMultiplier,
            intensity_shift: learningContextV2.adjustments.intensityShift,
            deload_recommended: learningContextV2.adjustments.deloadRecommended,
            confidence_score: learningContextV2.adjustments.confidenceScore,
            adjustments_applied: learningContextV2.guardrails.canApplyAdjustments && !LEARNING_CONTEXT_V2_FLAGS.loggingOnly,
            blocked_reason: learningContextV2.guardrails.blockedReason,
            cooldown_active: learningContextV2.guardrails.cooldownActive,
            raw_context: {
              progressions: learningContextV2.rawData.progressions,
              stagnations: learningContextV2.rawData.stagnations,
            },
            prompt_context: learningContextV2.promptContext,
          })
          .then(({ error }) => {
            if (error) {
              console.warn("Failed to log learning context:", error.message);
            } else {
              console.log("Learning Context V2 logged successfully");
            }
          });
      } else {
        console.log("No workout history found for user - skipping learning context");
      }
    } catch (historyError) {
      console.warn("Could not fetch user history for learning context:", historyError);
      // Continue normally without history - graceful degradation
    }

    // === BUILD USER PROMPT ===
    const userPrompt = buildUserPrompt(validatedData, filteredExercises, learningContext);

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
        max_tokens: 32000,
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
      // Clean the content - remove markdown code fences if present
      let cleanContent = content.trim();
      
      // Remove markdown JSON code block wrappers
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      // Try to parse the cleaned JSON
      workoutPlan = JSON.parse(cleanContent);
    } catch (parseError) {
      // Log the first 500 and last 500 chars to see what's wrong
      const contentPreview = content.length > 1000 
        ? `${content.slice(0, 500)}...TRUNCATED...${content.slice(-500)}`
        : content;
      console.error("Failed to parse AI response as JSON. Content preview:", contentPreview);
      console.error("Parse error:", parseError instanceof Error ? parseError.message : parseError);
      
      // Try to extract JSON from the response if it's wrapped in other text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          workoutPlan = JSON.parse(jsonMatch[0]);
          console.log("Successfully extracted JSON from wrapped response");
        } catch (secondParseError) {
          throw new Error("AI response is not valid JSON");
        }
      } else {
        throw new Error("AI response is not valid JSON");
      }
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

    // Calculate REAL volume from exercises (replace AI's declared values)
    const aiDeclaredVolume = workoutPlan.weeklyVolume || {};
    const calculatedVolume = calculateActualWeeklyVolume(workoutPlan);
    
    // Log comparison for debugging
    console.log("Volume comparison - AI declared:", JSON.stringify(aiDeclaredVolume));
    console.log("Volume comparison - Calculated:", JSON.stringify(calculatedVolume));
    
    // Replace with calculated volume
    workoutPlan.weeklyVolume = calculatedVolume;

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

// ═══════════════════════════════════════════════════════════════════════════════
//                          LEARNING CONTEXT V2 - FASE 2 (LOGGING ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

// Feature flags for gradual rollout
const LEARNING_CONTEXT_V2_FLAGS = {
  enabled: true,           // Master switch
  loggingOnly: true,       // Log but don't apply adjustments yet
  maxAdjustment: 0.15,     // Max ±15% adjustment
  minSessions: 5,          // Minimum sessions before applying adjustments
};

interface SessionData {
  perceived_effort: number | null;
  completed_sets: number;
  total_sets: number;
  completed_at: string | null;
  duration_minutes: number | null;
}

interface LoadData {
  exercise_name: string;
  load_value: string;
  created_at: string;
}

interface LearningContextV2Metrics {
  sessionsAnalyzed: number;
  avgRpe: number | null;
  rpeStdDev: number | null;
  completionRate: number | null;
  avgSessionDuration: number | null;
  actualFrequency: number | null;
  plannedFrequency: number;
}

interface LearningContextV2Adjustments {
  volumeMultiplier: number;
  intensityShift: 'maintain' | 'increase' | 'decrease';
  deloadRecommended: boolean;
  confidenceScore: number;
}

interface LearningContextV2Guardrails {
  canApplyAdjustments: boolean;
  blockedReason?: string;
  cooldownActive: boolean;
}

interface LearningContextV2 {
  metrics: LearningContextV2Metrics;
  adjustments: LearningContextV2Adjustments;
  guardrails: LearningContextV2Guardrails;
  promptContext: string;
  rawData: {
    sessions: SessionData[];
    loads: LoadData[];
    progressions: string[];
    stagnations: string[];
  };
}

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function calculateActualFrequency(sessions: SessionData[]): number | null {
  if (sessions.length < 2) return null;
  
  const dates = sessions
    .filter(s => s.completed_at)
    .map(s => new Date(s.completed_at!).getTime())
    .sort((a, b) => a - b);
  
  if (dates.length < 2) return null;
  
  const daySpan = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
  if (daySpan < 7) return null; // Need at least a week of data
  
  const weeks = daySpan / 7;
  return parseFloat((sessions.length / weeks).toFixed(1));
}

function calculateVolumeAdjustment(metrics: LearningContextV2Metrics): LearningContextV2Adjustments {
  let multiplier = 1.0;
  let intensityShift: 'maintain' | 'increase' | 'decrease' = 'maintain';
  let deloadRecommended = false;
  let confidenceScore = 0;
  
  // Only calculate if we have enough data
  if (metrics.sessionsAnalyzed < LEARNING_CONTEXT_V2_FLAGS.minSessions) {
    return {
      volumeMultiplier: 1.0,
      intensityShift: 'maintain',
      deloadRecommended: false,
      confidenceScore: 0,
    };
  }
  
  // Confidence based on data quantity
  confidenceScore = Math.min(1, metrics.sessionsAnalyzed / 10) * 0.5;
  
  // Adjust by frequency ratio
  if (metrics.actualFrequency !== null && metrics.plannedFrequency > 0) {
    const frequencyRatio = metrics.actualFrequency / metrics.plannedFrequency;
    confidenceScore += 0.2;
    
    if (frequencyRatio < 0.7) {
      // Training much less - slight compensation per session
      multiplier += 0.05;
    } else if (frequencyRatio > 1.2) {
      // Training much more - distribute volume
      multiplier -= 0.08;
    }
  }
  
  // Adjust by RPE
  if (metrics.avgRpe !== null) {
    confidenceScore += 0.2;
    
    if (metrics.avgRpe >= 9.0) {
      // Very high RPE - deload recommended
      multiplier -= 0.15;
      intensityShift = 'decrease';
      deloadRecommended = true;
    } else if (metrics.avgRpe >= 8.5) {
      // High RPE - reduce volume
      multiplier -= 0.10;
      intensityShift = 'decrease';
    } else if (metrics.avgRpe <= 5.5) {
      // Low RPE - can increase
      multiplier += 0.05;
      intensityShift = 'increase';
    }
  }
  
  // Adjust by completion rate
  if (metrics.completionRate !== null) {
    confidenceScore += 0.1;
    
    if (metrics.completionRate < 0.70) {
      // Very low completion - significantly reduce
      multiplier -= 0.15;
    } else if (metrics.completionRate < 0.80) {
      // Low completion - reduce
      multiplier -= 0.05;
    } else if (metrics.completionRate >= 0.95 && metrics.avgRpe !== null && metrics.avgRpe < 7) {
      // High completion + low RPE - can increase
      multiplier += 0.05;
    }
  }
  
  // Apply guardrails: limit to ±15%
  const maxAdj = LEARNING_CONTEXT_V2_FLAGS.maxAdjustment;
  multiplier = Math.max(1 - maxAdj, Math.min(1 + maxAdj, multiplier));
  
  return {
    volumeMultiplier: parseFloat(multiplier.toFixed(2)),
    intensityShift,
    deloadRecommended,
    confidenceScore: parseFloat(confidenceScore.toFixed(2)),
  };
}

// Type for last rated plan
interface LastRatedPlan {
  plan_name: string;
  user_rating: number;
  rating_notes: string | null;
  rated_at: string;
}

function buildLearningContextV2(
  sessions: SessionData[], 
  loadHistory: LoadData[],
  plannedFrequency: number,
  lastRatedPlan?: LastRatedPlan | null
): LearningContextV2 {
  // Calculate metrics
  const sessionsWithRpe = sessions.filter(s => s.perceived_effort !== null && s.perceived_effort > 0);
  const rpeValues = sessionsWithRpe.map(s => s.perceived_effort!);
  
  const avgRpe = rpeValues.length > 0
    ? parseFloat((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length).toFixed(1))
    : null;
  
  const rpeStdDev = rpeValues.length >= 2
    ? parseFloat(calculateStdDev(rpeValues).toFixed(2))
    : null;
  
  const totalPrescribed = sessions.reduce((sum, s) => sum + s.total_sets, 0);
  const totalCompleted = sessions.reduce((sum, s) => sum + s.completed_sets, 0);
  const completionRate = totalPrescribed > 0 
    ? parseFloat((totalCompleted / totalPrescribed).toFixed(2))
    : null;
  
  const durations = sessions.filter(s => s.duration_minutes).map(s => s.duration_minutes!);
  const avgSessionDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;
  
  const actualFrequency = calculateActualFrequency(sessions);
  
  const metrics: LearningContextV2Metrics = {
    sessionsAnalyzed: sessions.length,
    avgRpe,
    rpeStdDev,
    completionRate,
    avgSessionDuration,
    actualFrequency,
    plannedFrequency,
  };
  
  // Analyze load progressions
  const loadsByExercise: Record<string, { value: string; date: string }[]> = {};
  loadHistory.forEach(load => {
    if (!loadsByExercise[load.exercise_name]) {
      loadsByExercise[load.exercise_name] = [];
    }
    loadsByExercise[load.exercise_name].push({
      value: load.load_value,
      date: load.created_at
    });
  });
  
  const progressions: string[] = [];
  const stagnations: string[] = [];
  
  Object.entries(loadsByExercise).forEach(([exercise, loads]) => {
    if (loads.length >= 2) {
      const sortedLoads = loads.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const oldest = parseFloat(sortedLoads[0].value) || 0;
      const newest = parseFloat(sortedLoads[sortedLoads.length - 1].value) || 0;
      
      if (oldest > 0 && newest > oldest) {
        const increase = (((newest - oldest) / oldest) * 100).toFixed(0);
        progressions.push(`${exercise}: ${sortedLoads[0].value} → ${sortedLoads[sortedLoads.length - 1].value} (+${increase}%)`);
      } else if (oldest > 0 && newest === oldest && loads.length >= 4) {
        stagnations.push(exercise);
      }
    }
  });
  
  // Calculate adjustments
  const adjustments = calculateVolumeAdjustment(metrics);
  
  // Check guardrails
  const guardrails: LearningContextV2Guardrails = {
    canApplyAdjustments: false,
    cooldownActive: false,
  };
  
  if (sessions.length < LEARNING_CONTEXT_V2_FLAGS.minSessions) {
    guardrails.blockedReason = `Dados insuficientes (${sessions.length}/${LEARNING_CONTEXT_V2_FLAGS.minSessions} sessões)`;
  } else if (LEARNING_CONTEXT_V2_FLAGS.loggingOnly) {
    guardrails.blockedReason = 'Modo logging only ativo (Fase 2 Alpha)';
  } else {
    guardrails.canApplyAdjustments = true;
  }
  
  // Build prompt context
  const promptContext = buildPromptContext(metrics, adjustments, guardrails, progressions, stagnations, lastRatedPlan);
  
  
  return {
    metrics,
    adjustments,
    guardrails,
    promptContext,
    rawData: { sessions, loads: loadHistory, progressions, stagnations },
  };
}

function buildPromptContext(
  metrics: LearningContextV2Metrics,
  adjustments: LearningContextV2Adjustments,
  guardrails: LearningContextV2Guardrails,
  progressions: string[],
  stagnations: string[],
  lastRatedPlan?: LastRatedPlan | null
): string {
  let context = `
## 🧠 HISTÓRICO DO USUÁRIO (LEARNING CONTEXT V2)
`;

  // Add last plan rating if available
  if (lastRatedPlan) {
    const ratingLabels: Record<number, string> = {
      1: 'Ruim',
      2: 'Regular',
      3: 'Bom',
      4: 'Muito bom',
      5: 'Excelente'
    };
    context += `
### ⭐ Avaliação do Plano Anterior:
- Plano: "${lastRatedPlan.plan_name}"
- Nota: ${lastRatedPlan.user_rating}/5 (${ratingLabels[lastRatedPlan.user_rating] || ''})
${lastRatedPlan.rating_notes ? `- Feedback do usuário: "${lastRatedPlan.rating_notes}"` : ''}

**INSTRUÇÃO**: Use esta avaliação para ajustar o novo plano:
${lastRatedPlan.user_rating <= 2 ? `- ⚠️ Avaliação BAIXA: Fazer mudanças SIGNIFICATIVAS na estrutura, exercícios e/ou volume` : ''}
${lastRatedPlan.user_rating === 3 ? `- Avaliação MÉDIA: Fazer ajustes MODERADOS, manter o que funcionou` : ''}
${lastRatedPlan.user_rating >= 4 ? `- ✅ Avaliação ALTA: Manter estrutura similar, fazer ajustes finos` : ''}
`;
  }

  context += `
### Últimas ${metrics.sessionsAnalyzed} sessões analisadas:`;

  if (metrics.avgRpe !== null) {
    context += `\n- RPE médio: ${metrics.avgRpe}/10`;
    if (metrics.rpeStdDev !== null) {
      context += ` (desvio: ±${metrics.rpeStdDev})`;
    }
  }
  
  if (metrics.completionRate !== null) {
    context += `\n- Taxa de conclusão: ${(metrics.completionRate * 100).toFixed(0)}%`;
  }
  
  if (metrics.actualFrequency !== null) {
    context += `\n- Frequência real: ${metrics.actualFrequency} dias/semana (planejado: ${metrics.plannedFrequency})`;
  }
  
  if (metrics.avgSessionDuration !== null) {
    context += `\n- Duração média: ${metrics.avgSessionDuration} min`;
  }

  if (progressions.length > 0) {
    context += `\n\n### Progressão de Cargas Detectada:`;
    progressions.slice(0, 5).forEach(p => {
      context += `\n- ${p}`;
    });
  }
  
  if (stagnations.length > 0) {
    context += `\n\n### ⚠️ Estagnação Detectada:`;
    stagnations.slice(0, 3).forEach(s => {
      context += `\n- ${s}`;
    });
  }

  // Build recommendations based on data
  const recommendations: string[] = [];
  
  if (metrics.avgRpe !== null) {
    if (metrics.avgRpe > 8.5) {
      recommendations.push("⚠️ RPE ALTO: Considerar reduzir volume em 10-15% para evitar overtraining");
    } else if (metrics.avgRpe < 5.5) {
      recommendations.push("📈 RPE BAIXO: Considerar aumentar intensidade/volume para maior estímulo");
    } else if (metrics.avgRpe >= 6 && metrics.avgRpe <= 8) {
      recommendations.push("✅ RPE ideal (6-8): Manter progressão atual");
    }
  }

  if (metrics.completionRate !== null && metrics.completionRate < 0.80) {
    recommendations.push("⚠️ TAXA CONCLUSÃO BAIXA (<80%): Simplificar treino, reduzir exercícios por sessão");
  }

  if (stagnations.length > 0) {
    recommendations.push(`🔄 ESTAGNAÇÃO: Incluir variação de estímulo para: ${stagnations.slice(0, 3).join(', ')}`);
  }
  
  if (adjustments.deloadRecommended) {
    recommendations.push("🛑 DELOAD RECOMENDADO: Alta fadiga acumulada detectada");
  }

  if (recommendations.length > 0) {
    context += `\n\n### 🎯 Recomendações Baseadas em Dados:`;
    recommendations.forEach(r => {
      context += `\n${r}`;
    });
  }
  
  // V2: Show calculated adjustments (logging mode - informational only)
  context += `\n
### 📊 Ajuste Calculado (V2 - Logging Only):
- Multiplicador de volume: ${adjustments.volumeMultiplier}x
- Direção de intensidade: ${adjustments.intensityShift}
- Confiança: ${(adjustments.confidenceScore * 100).toFixed(0)}%
- Status: ${guardrails.canApplyAdjustments ? '✅ Ativo' : `⏸️ ${guardrails.blockedReason}`}

### ⚠️ INSTRUÇÕES DE AJUSTE:
- Use as informações acima para INFORMAR a prescrição
- Se RPE está alto: PRIORIZE recuperação sobre volume
- Se há estagnação: INCLUA variações dos exercícios estagnados
- Se taxa de conclusão é baixa: REDUZA número de exercícios por sessão
`;

  return context;
}

// Legacy function for backwards compatibility
function buildLearningContext(sessions: SessionData[], loadHistory: LoadData[]): string {
  const context = buildLearningContextV2(sessions, loadHistory, 3);
  return context.promptContext;
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          USER PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildUserPrompt(userData: ValidatedUserData, exercises: Exercise[], learningContext: string = ""): string {
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

  // Calculate density strategy for time-limited sessions
  const densityStrategy = calculateDensityStrategy({
    sessionDuration: userData.sessionDuration || "45min",
    goal: userData.goal,
    experienceLevel: level,
    focusAreas: userData.bodyAreas || []
  });

  // Determine if user has focus preference for isolation exercises
  const hasUserPreference = userData.bodyAreas && userData.bodyAreas.length > 0;

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

  // Analyze day pattern for split selection
  const dayPattern = analyzeDayPattern(userData.trainingDays || []);
  const freqKey = (userData.trainingDays?.length || 3).toString();
  
  // Check if user has a split preference (only for 3x/week intermediate/advanced)
  let splitRule: SplitRule;
  const hasSplitPreference = userData.splitPreference && 
    (userData.trainingDays?.length || 0) === 3 && 
    level !== 'beginner';
  
  if (hasSplitPreference) {
    // Map user preference to split rules
    const splitPreferenceMap: Record<string, SplitRule> = {
      'fullbody': SPLIT_RULES_BY_PATTERN["3"].alternating,
      'push_pull_legs': SPLIT_RULES_BY_PATTERN["3"].consecutive,
      'hybrid': {
        split: "Full Body + Push/Pull Híbrido",
        description: "Full Body fundamentos + dias especializados para 2 estímulos por grupo",
        dayStructure: ["Full Body", "Push + Quads", "Pull + Posterior"]
      },
      'no_preference': {
        split: "Full Body 3x (Variedade Máxima)",
        description: "Full Body com exercícios DIFERENTES em cada dia - PROIBIDO repetir exercícios na semana",
        dayStructure: ["Full Body A", "Full Body B", "Full Body C"],
        specialInstruction: "REGRA CRÍTICA: Nenhum exercício pode repetir entre os 3 dias. Use exercícios diferentes para cada grupamento em cada treino."
      }
    };
    splitRule = splitPreferenceMap[userData.splitPreference!] || SPLIT_RULES_BY_PATTERN["3"].alternating;
    console.log(`Using user's split preference: ${userData.splitPreference}`);
  } else {
    // Automatic detection based on day pattern
    splitRule = SPLIT_RULES_BY_PATTERN[freqKey]?.[dayPattern.pattern] 
      || SPLIT_RULES_BY_PATTERN["3"]?.alternating;
    console.log(`Auto-detected split based on pattern: ${dayPattern.pattern}`);
  }

  // Build day pattern section
  const dayPatternSection = splitRule ? `
## 🗓️ PADRÃO DE DIAS E SPLIT OBRIGATÓRIO

**Dias selecionados:** ${dayPattern.dayNames.map(d => getDayLabel(d)).join(', ')}
**Padrão detectado:** ${getPatternLabel(dayPattern.pattern)}
${dayPattern.consecutiveGroups.length > 0 
  ? `**Dias consecutivos:** ${dayPattern.consecutiveGroups.map(g => g.map(d => getDayLabel(d)).join('→')).join(' | ')}` 
  : '**Dias consecutivos:** Nenhum (ideal para recuperação)'}

### ⚠️ SPLIT DEFINIDO (OBRIGATÓRIO):
- **Tipo:** ${splitRule.split}
- **Descrição:** ${splitRule.description}
- **Estrutura:** ${splitRule.dayStructure.join(' → ')}
${splitRule.specialInstruction ? `
### 🔴 INSTRUÇÃO ESPECIAL (CRÍTICA):
${splitRule.specialInstruction}
` : ''}
### REGRAS DE ESPAÇAMENTO (PREFERENCIAL):
1. PREFERIR espaçar estímulos do mesmo grupamento (48-72h ideal)
2. Se dias são consecutivos: EVITAR mesmo grupamento PRINCIPAL em dias seguidos
3. Grupamentos secundários/acessórios PODEM repetir em dias seguidos (ex: core, panturrilhas)
4. O VOLUME SEMANAL TOTAL é o que determina hipertrofia, não a distribuição exata
` : '';

  // Build density section for time-limited sessions
  const densitySection = densityStrategy.enabled ? `
## ⚡ MODO TEMPO LIMITADO ATIVADO

O usuário tem APENAS ${userData.sessionDuration} disponíveis para objetivo de ${getGoalShort(userData.goal)}.

### AQUECIMENTO OBRIGATÓRIO:
- ${densityStrategy.warmupStrategy.description}
- Tempo: ${densityStrategy.warmupStrategy.timeMinutes} minutos
- NÃO incluir aquecimento geral separado

### REGRA DE ISOLADOS:
${densityStrategy.allowIsolation 
  ? `✅ ISOLADOS PERMITIDOS - usuário solicitou foco em: ${userData.bodyAreas?.filter(a => 
      ['arms', 'biceps', 'triceps', 'braços', 'bíceps', 'tríceps', 'shoulders', 'ombros'].includes(a.toLowerCase())
    ).join(', ') || 'áreas específicas'}`
  : `❌ SEM ISOLADOS - usar apenas COMPOSTOS. Braços/Tríceps trabalham indiretamente em compostos.`
}

### INSTRUÇÕES DE DENSIDADE:
1. DESCANSO REDUZIDO: 60-75s em compostos secundários${densityStrategy.allowIsolation ? ', 45-60s em isoladores' : ''}
2. MANTER descanso normal (90s) apenas no composto PRINCIPAL de cada treino
3. META: ${densityStrategy.targetSetsPerSession.min}-${densityStrategy.targetSetsPerSession.max} séries por sessão

### PRIORIZAÇÃO DE GRUPOS:
${hasUserPreference 
  ? `FOCO DO USUÁRIO: ${userData.bodyAreas?.join(', ')} → manter volume máximo`
  : `SEM PREFERÊNCIA → Priorizar: Peito, Costas, Quadríceps, Glúteos (11+ séries/semana)`
}
${!densityStrategy.allowIsolation ? `
### GRUPOS COM TRABALHO INDIRETO APENAS:
- Bíceps: coberto por remadas e puxadas
- Tríceps: coberto por supino e desenvolvimento
- Panturrilha: coberto por agachamentos e leg press` : ''}

❌ PROIBIDO: Supersets entre equipamentos diferentes (problema de logística)
` : '';

  // Build volume section with CALCULATED values
  const volumeSection = `
## 🎯 VOLUME CALCULADO PARA ESTE USUÁRIO

**Perfil**: ${getLevelLabel(userData.experienceLevel)} | ${getGoalShort(userData.goal)} | ${userData.sessionDuration || "45min"} | ${userData.trainingDays?.length || 3} dias/sem
**Split recomendado**: ${splitRule?.split || volumeRanges.recommendedSplit}
**Séries por treino**: ${densityStrategy.enabled ? `${densityStrategy.targetSetsPerSession.min}-${densityStrategy.targetSetsPerSession.max}` : `${volumeRanges.setsPerWorkout.min}-${volumeRanges.setsPerWorkout.max}`}
**Aquecimento**: ${densityStrategy.warmupStrategy.timeMinutes} min (${densityStrategy.warmupStrategy.type === 'specific' ? 'específico' : 'geral + específico'})

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
| Bíceps           | ${densityStrategy.allowIsolation ? volumeRanges.small.min : 0} | ${volumeRanges.small.max} |
| Tríceps          | ${densityStrategy.allowIsolation ? volumeRanges.small.min : 0} | ${volumeRanges.small.max} |
| Panturrilhas     | ${volumeRanges.small.min} | ${volumeRanges.small.max} |
| Core             | ${volumeRanges.small.min} | ${volumeRanges.small.max} |

### ⚠️ REGRAS CRÍTICAS:
- TODOS os grupamentos DEVEM estar DENTRO das faixas acima
- Cintura Escapular: OBRIGATÓRIO pelo menos 1 exercício (crucifixo inverso, remada aberta)
- Costas >= Peitoral em volume (equilíbrio postural)
- Se há área prioritária: pode aumentar até +30% apenas naquela área
- NUNCA reduzir outros grupos abaixo do mínimo
- Core INCLUI exercícios de lombar (Hiperextensão, Good Morning contam como core)
${!densityStrategy.allowIsolation ? '- Bíceps/Tríceps: ZERO séries diretas OK (trabalho indireto suficiente)' : ''}
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
- Padrão de dias: ${getPatternLabel(dayPattern.pattern)}
- Duração por sessão: ${getSessionLabel(userData.sessionDuration)}

## PREFERÊNCIAS
- Tipos de exercício: ${userData.exerciseTypes?.join(', ') || 'Variado'}
- Aceita cardio: ${userData.includeCardio ? 'SIM' : 'NÃO'}
${userData.includeCardio && userData.cardioTiming ? `- Timing do cardio: ${getCardioTimingLabel(userData.cardioTiming)}` : ''}
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

${userData.splitPreference === 'no_preference' ? `
## ⚠️ REGRA CRÍTICA - VARIEDADE MÁXIMA
- Split: Full Body 3x
- **NENHUM exercício pode se repetir na semana**
- Cada dia (A, B, C) DEVE ter exercícios DIFERENTES para cada grupamento
- Exemplo: Supino Reto (A) → Supino Inclinado (B) → Crucifixo (C)
- Esta regra é OBRIGATÓRIA e sobrepõe outras preferências de variação
` : ''}
${dayPatternSection}

${densitySection}

${volumeSection}

${periodizationSection}

${catalogStr}

═══════════════════════════════════════════════════════════════════════════════
                              INSTRUÇÕES FINAIS
═══════════════════════════════════════════════════════════════════════════════

Gere um plano de treino completo seguindo RIGOROSAMENTE:

1. O SPLIT OBRIGATÓRIO: "${splitRule?.split || volumeRanges.recommendedSplit}" (definido acima)
2. Os RANGES DE VOLUME calculados acima
3. ${densityStrategy.enabled ? `${densityStrategy.targetSetsPerSession.min}-${densityStrategy.targetSetsPerSession.max}` : `${volumeRanges.setsPerWorkout.min}-${volumeRanges.setsPerWorkout.max}`} séries por treino
4. A periodização "${periodizationConfig.type}" definida acima
5. TODAS as adaptações para condições de saúde
6. Priorização das áreas solicitadas (se houver)
7. USE APENAS EXERCÍCIOS DO CATÁLOGO
8. INCLUA ALTERNATIVAS se houver lesão
9. VARIE os intervalos de descanso CONFORME a faixa de repetições
10. weeklyVolume DEVE ter TODOS os grupos DENTRO da faixa (core inclui lombar)
11. VERIFIQUE que total de séries × tempo/série ≤ tempo disponível
12. Aquecimento: ${densityStrategy.warmupStrategy.timeMinutes} min (${densityStrategy.warmupStrategy.description})
13. progressionPlan DEVE refletir a periodização "${periodizationConfig.type}"
14. Se dias são CONSECUTIVOS: EVITE mesmo grupamento principal em dias seguidos
${!densityStrategy.allowIsolation ? `15. ❌ SEM ISOLADOS: Use APENAS exercícios compostos. Bíceps/Tríceps = trabalho indireto` : ''}
${userData.includeCardio ? `
## CARDIO SOLICITADO
- Timing preferido: ${getCardioTimingLabel(userData.cardioTiming)}
${userData.cardioTiming === 'post_workout' ? 
  `- INCLUIR cardio ao final de cada treino (10-20min dependendo da duração da sessão)
- Se sessão = 30min: Avisar no "notes" que cardio deve ser feito separadamente por falta de tempo` :
  userData.cardioTiming === 'separate_day' ?
  `- NÃO incluir cardio na sessão de força
- Indicar no progressionPlan os dias ideais para cardio separado (dias sem treino de força)` :
  `- Decidir timing baseado em:
  - Objetivo: ${userData.goal === 'weight_loss' ? 'pós-treino preferível para maximizar gasto calórico' : 'flexível'}
  - Duração: ${userData.sessionDuration === '30min' ? 'sessão curta = cardio em dia separado obrigatório' : 'pós-treino possível'}
  - Nível: ${userData.experienceLevel}`
}` : ''}
${learningContext}`;
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

function getCardioTimingLabel(timing: string | null | undefined): string {
  const labels: Record<string, string> = {
    post_workout: "Pós-treino (adicionar ao final da sessão)",
    separate_day: "Em dias separados (não incluir na sessão de força)",
    ai_decides: "IA decide baseado no objetivo e tempo disponível",
  };
  return labels[timing || "ai_decides"] || "IA decide";
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
