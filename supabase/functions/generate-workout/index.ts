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
function sanitizeForPrompt(text: string): string {
  if (!text) return "";
  return text
    .replace(/ignore\s*(all\s*)?(previous|above|prior)\s*(instructions?)?/gi, "")
    .replace(/system\s*:/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 500);
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          VOLUME RANGES BY LEVEL
// ═══════════════════════════════════════════════════════════════════════════════

interface VolumeRange {
  min: number;
  max: number;
}

interface VolumeRanges {
  large: VolumeRange;  // chest, back, quadriceps, hamstrings, glutes
  medium: VolumeRange; // shoulders
  small: VolumeRange;  // biceps, triceps, calves, core
}

function getVolumeRanges(level: string): VolumeRanges {
  switch (level) {
    case "beginner":
      return {
        large: { min: 8, max: 12 },
        medium: { min: 6, max: 10 },
        small: { min: 4, max: 8 },
      };
    case "intermediate":
      return {
        large: { min: 12, max: 18 },
        medium: { min: 10, max: 14 },
        small: { min: 8, max: 12 },
      };
    case "advanced":
      return {
        large: { min: 16, max: 26 },
        medium: { min: 12, max: 20 },
        small: { min: 10, max: 16 },
      };
    default:
      return {
        large: { min: 8, max: 12 },
        medium: { min: 6, max: 10 },
        small: { min: 4, max: 8 },
      };
  }
}

function getMuscleCategory(muscle: string): "large" | "medium" | "small" {
  const largeGroups = ["chest", "back", "quadriceps", "hamstrings", "glutes"];
  const mediumGroups = ["shoulders"];
  
  if (largeGroups.includes(muscle.toLowerCase())) return "large";
  if (mediumGroups.includes(muscle.toLowerCase())) return "medium";
  return "small";
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
  periodization: z.string(),
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
//                          POST-AI VALIDATION FUNCTION (ENHANCED)
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
    sleepHours: string | null;
    stressLevel: string | null;
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
        if (unknownExercises <= 5) { // Limit warnings
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
  
  // 5. CRITICAL: Validate weekly volume per muscle group
  const level = userData.experienceLevel || "beginner";
  const volumeRanges = getVolumeRanges(level);
  const weeklyVolume = plan.weeklyVolume || {};
  
  // Check if sleep/stress reduction applies
  const sleepHours = parseInt(userData.sleepHours || "7", 10);
  const hasLowRecovery = sleepHours < 6 || userData.stressLevel === "high";
  const volumeReductionFactor = hasLowRecovery ? 0.75 : 1; // 25% reduction if low recovery
  
  // Define all muscle groups to check
  const muscleGroups = {
    large: ["chest", "back", "quadriceps", "hamstrings", "glutes"],
    medium: ["shoulders"],
    small: ["biceps", "triceps", "calves", "core"],
  };
  
  // Validate each muscle group
  Object.entries(muscleGroups).forEach(([category, muscles]) => {
    const range = volumeRanges[category as keyof VolumeRanges];
    const adjustedMin = Math.floor(range.min * volumeReductionFactor);
    
    muscles.forEach((muscle) => {
      const volume = weeklyVolume[muscle] || 0;
      
      if (volume < adjustedMin) {
        errors.push(
          `Volume INSUFICIENTE para ${muscle}: ${volume} séries (mínimo ${adjustedMin} para ${level})`
        );
      }
      
      if (volume > range.max) {
        warnings.push(
          `Volume EXCESSIVO para ${muscle}: ${volume} séries (máximo ${range.max} para ${level})`
        );
      }
    });
  });
  
  // 6. Validate exercise count per session based on duration
  const sessionDuration = plan.sessionDuration || "45 min";
  const minExercises = sessionDuration.includes("30") ? 4 : sessionDuration.includes("45") ? 5 : 6;
  const maxExercises = sessionDuration.includes("30") ? 5 : sessionDuration.includes("45") ? 7 : 10;
  
  for (const workout of plan.workouts || []) {
    const exerciseCount = workout.exercises?.length || 0;
    if (exerciseCount < minExercises) {
      warnings.push(`Treino "${workout.name}" tem apenas ${exerciseCount} exercícios (mínimo ${minExercises} para ${sessionDuration})`);
    }
    if (exerciseCount > maxExercises) {
      warnings.push(`Treino "${workout.name}" tem ${exerciseCount} exercícios (máximo ${maxExercises} para ${sessionDuration})`);
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

const SYSTEM_PROMPT = `Você é um prescritor de exercícios físicos altamente qualificado para academias low-cost. Você DEVE gerar planos de treino personalizados seguindo RIGOROSAMENTE TODAS as diretrizes técnicas abaixo. NUNCA ignore uma regra.

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 1: VOLUME SEMANAL POR GRUPAMENTO (CRÍTICO)
═══════════════════════════════════════════════════════════════════════════════

## TABELA OBRIGATÓRIA DE VOLUME MÍNIMO E MÁXIMO (séries/semana):

### INICIANTE:
| Grupamento         | Mínimo | Máximo | Observação                    |
|--------------------|--------|--------|-------------------------------|
| Peitoral           | 8      | 12     | Grupo grande                  |
| Costas             | 8      | 12     | Grupo grande                  |
| Quadríceps         | 8      | 12     | Grupo grande                  |
| Isquiotibiais      | 8      | 12     | Grupo grande                  |
| Glúteos            | 8      | 12     | Grupo grande                  |
| Ombros             | 6      | 10     | Grupo médio                   |
| Bíceps             | 4      | 8      | Grupo pequeno                 |
| Tríceps            | 4      | 8      | Grupo pequeno                 |
| Panturrilhas       | 4      | 8      | Grupo pequeno                 |
| Core               | 4      | 8      | Grupo pequeno                 |

### INTERMEDIÁRIO:
| Grupamento         | Mínimo | Máximo | Observação                    |
|--------------------|--------|--------|-------------------------------|
| Peitoral           | 12     | 18     | Grupo grande                  |
| Costas             | 12     | 18     | Grupo grande                  |
| Quadríceps         | 12     | 18     | Grupo grande                  |
| Isquiotibiais      | 12     | 18     | Grupo grande                  |
| Glúteos            | 12     | 18     | Grupo grande                  |
| Ombros             | 10     | 14     | Grupo médio                   |
| Bíceps             | 8      | 12     | Grupo pequeno                 |
| Tríceps            | 8      | 12     | Grupo pequeno                 |
| Panturrilhas       | 8      | 12     | Grupo pequeno                 |
| Core               | 8      | 12     | Grupo pequeno                 |

### AVANÇADO:
| Grupamento         | Mínimo | Máximo | Observação                    |
|--------------------|--------|--------|-------------------------------|
| Peitoral           | 16     | 26     | Grupo grande                  |
| Costas             | 16     | 26     | Grupo grande                  |
| Quadríceps         | 16     | 26     | Grupo grande                  |
| Isquiotibiais      | 16     | 26     | Grupo grande                  |
| Glúteos            | 16     | 26     | Grupo grande                  |
| Ombros             | 12     | 20     | Grupo médio                   |
| Bíceps             | 10     | 16     | Grupo pequeno                 |
| Tríceps            | 10     | 16     | Grupo pequeno                 |
| Panturrilhas       | 10     | 16     | Grupo pequeno                 |
| Core               | 10     | 16     | Grupo pequeno                 |

## REGRA DE OURO DO VOLUME:
- NUNCA prescrever volume abaixo do MÍNIMO para o nível
- Se há redução por sono/estresse (-25%), aplicar sobre o valor MÉDIO, não abaixo do mínimo absoluto
- Se há foco em um grupamento, aumentar 20-30% o volume DAQUELE grupamento, não reduzir os demais
- TODOS os grupamentos devem estar dentro da faixa, sem exceção

## Volume por Frequência Semanal (distribuição):
- 2-3 treinos/semana: distribuir volume em todas as sessões (Full Body ou A/B)
- 4 treinos/semana: dividir volume entre Upper/Lower (2x cada)
- 5-6 treinos/semana: PPL ou divisão similar (cada grupo 2x/semana)

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 2: REPETIÇÕES E INTENSIDADE POR OBJETIVO
═══════════════════════════════════════════════════════════════════════════════

## Número de Repetições:
- FORÇA: 4-6 reps (70-85% 1RM)
- HIPERTROFIA: 6-12 reps (65-80% 1RM)
- RESISTÊNCIA/EMAGRECIMENTO: 12-20 reps (50-70% 1RM)
- SAÚDE: 10-15 reps (60-75% 1RM)

## Intervalo entre Séries:
- FORÇA: 90-180 segundos (até 3 minutos para compostos pesados)
- HIPERTROFIA: 60-90 segundos (USAR VARIAÇÃO: 60s, 75s, 90s - não apenas 90s)
- EMAGRECIMENTO: 30-60 segundos (alta densidade)
- SAÚDE: 45-75 segundos

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 3: NÚMERO DE EXERCÍCIOS POR TEMPO DE SESSÃO
═══════════════════════════════════════════════════════════════════════════════

## Configuração por Duração:
- ATÉ 30 MIN: 4-5 exercícios, usar supersets obrigatório para densidade
- 30-45 MIN: 5-6 exercícios (MÍNIMO 5), pausas moderadas
- 45-60 MIN: 6-8 exercícios (MÍNIMO 6), pausas adequadas
- +60 MIN: 8-10 exercícios, treino completo

## Regras de Tempo:
- Se tempo <30 min: prioridade para bloco resistido, cardio apenas se solicitado (curto)
- Se tempo 30-45 min: bloco resistido + cardio curto (10-15 min) opcional
- Se tempo >45 min: permite cardio de maior duração (20-30 min)

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 4: DIVISÕES DE TREINO E FREQUÊNCIA DE ESTÍMULO
═══════════════════════════════════════════════════════════════════════════════

## REGRA FUNDAMENTAL DE FREQUÊNCIA:
- Estimular cada grupo muscular 2-3x por semana é SUPERIOR a apenas 1x por semana
- PRIORIZE divisões que permitam treinar cada grupo ao menos 2x/semana
- Isso otimiza a síntese proteica e acelera a adaptação muscular
- Distribua o volume semanal por grupamento em múltiplas sessões

## 2 treinos/semana:
- OBRIGATÓRIO: Full Body em ambos os dias
- Cada grupo muscular será estimulado 2x/semana
- Volume moderado por sessão para permitir recuperação (5-7 exercícios)
- Priorizar exercícios multiarticulares

## 3 treinos/semana:
- OPÇÃO 1 (RECOMENDADA): Full Body x3 - cada grupo 3x/semana
- OPÇÃO 2: A/B/A alternado (ex: Superior/Inferior/Superior) - cada grupo 1.5x/semana em média
- Supersets para otimização do tempo quando necessário
- Variar ênfase entre os dias para evitar sobrecarga

## 4 treinos/semana:
- RECOMENDADO: A/B x2 (Upper 2x, Lower 2x) - cada grupo 2x/semana
- ALTERNATIVA: Upper/Lower alternado
- EVITAR: Split tradicional que treine cada grupo apenas 1x/semana
- Ideal para recomposição corporal

## 5 treinos/semana:
- RECOMENDADO: Push/Pull/Legs + Upper/Lower - cada grupo 2x/semana mínimo
- ALTERNATIVA: A/B/C/A/B com repetição dos dias mais fracos
- EVITAR: Split de 5 dias diferentes (cada grupo 1x/semana)
- Técnicas avançadas permitidas para intermediários/avançados

## 6 treinos/semana:
- RECOMENDADO: Push/Pull/Legs x2 - cada grupo 2x/semana
- ALTERNATIVA: A/B/C x2 ou divisão por valências (força, potência, resistência)
- APENAS para avançados com objetivo de hipertrofia ou performance
- Volume distribuído para permitir recuperação adequada

## 7 treinos/semana:
- OBRIGATÓRIO incluir dia leve ou regenerativo (mobilidade ou cardio leve)
- Push/Pull/Legs + repetição + regenerativo
- Alternância de estímulos e intensidades
- Apenas para atletas ou muito avançados

## TABELA RESUMO DE FREQUÊNCIA MÍNIMA:
| Dias/Semana | Divisão Recomendada       | Freq. por Grupo |
|-------------|---------------------------|-----------------|
| 2           | Full Body x2              | 2x/semana       |
| 3           | Full Body x3              | 3x/semana       |
| 4           | Upper/Lower x2            | 2x/semana       |
| 5           | PPL + Upper/Lower         | 2x/semana       |
| 6           | PPL x2                    | 2x/semana       |
| 7           | PPL x2 + Regenerativo     | 2x/semana       |

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 5: MODELOS DE PERIODIZAÇÃO LINEAR
═══════════════════════════════════════════════════════════════════════════════

## Estrutura Geral:
- Bloco de 4 semanas + 1 semana de recuperação (deload)
- Repetir o bloco 2-3 vezes antes de mudar estímulo

## Hipertrofia - Progressão Crescente na Carga:
- Semana 1: 15 reps
- Semana 2: 12 reps
- Semana 3: 10-8 reps
- Semana 4: 8-6 reps
- Semana 5: 8-10 reps (recuperação/deload)

## Hipertrofia - Progressão Decrescente na Carga:
- Semana 1: 8 reps
- Semana 2: 10 reps
- Semana 3: 12 reps
- Semana 4: 15 reps
- Semana 5: 10-12 reps (recuperação)

## Força e Hipertrofia Combinados:
- Semana 1: 10-8 reps
- Semana 2: 8-6 reps
- Semana 3: 6-4 reps
- Semana 4: 4-3 reps
- Semana 5: 8-10 reps (recuperação)

## Regras de Periodização por Frequência:
- ≤3x/semana: LINEAR, foco em consistência e técnica
- ≥4x/semana: LINEAR ou ONDULATÓRIA para otimização de carga e recuperação
- Ajustes semanais conforme constância e readiness

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 6: REGRAS DETALHADAS POR OBJETIVO
═══════════════════════════════════════════════════════════════════════════════

## EMAGRECIMENTO:
- Densidade ALTA (pausas curtas, supersets obrigatórios, circuitos)
- Gasto calórico elevado prioritário
- Reps: 12-20 por série
- Intervalo: 30-60 seg
- Cardio: 2-4x/semana integrado ou em dias alternados
- MÉTODOS PERMITIDOS: circuitos, supersets, EMOM, giant sets
- Periodização: linear ou ondulatória
- INCLUIR: exercícios metabólicos (burpees modificados, mountain climbers em máquina)

## HIPERTROFIA:
- Volume: usar faixas da SEÇÃO 1 conforme nível
- Reps: 6-12 por série
- Intervalo: 60-90 seg (VARIAR entre 60s, 75s, 90s)
- MÉTODOS PARA INTERMEDIÁRIOS/AVANÇADOS: drop set, rest-pause, bi-set
- Progressão focada em aumento de carga progressivo
- Falha muscular: apenas na última série de cada exercício

## SAÚDE E BEM-ESTAR:
- Volume: usar faixas da SEÇÃO 1 conforme nível
- Reps: 10-15 por série
- Intervalo: 45-75 segundos
- Foco em equilíbrio muscular e postura
- PRIORIZAR: exercícios funcionais e multiarticulares
- Cardio moderado opcional
- INCLUIR: exercícios de core, estabilizadores, mobilidade

## PERFORMANCE (FORÇA):
- Força: 4-6 reps, pausas longas (2-3 min)
- Potência: 3-6 reps explosivas
- Resistência: 15-20+ reps
- Periodização: ONDULATÓRIA obrigatória para avançados
- MÉTODOS: cluster, excêntrica controlada, pause reps

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 7: REGRAS POR NÍVEL DE EXPERIÊNCIA
═══════════════════════════════════════════════════════════════════════════════

## INICIANTE (Baixa Experiência):
- PRIORIZAR: MÁQUINAS e exercícios de autocarga
- Foco em aprendizado técnico e controle motor
- EVITAR: métodos avançados (drop set, cluster, rest-pause)
- Volume: conforme SEÇÃO 1 - faixa INICIANTE
- Sessões com menor complexidade
- Multiarticulares GUIADOS (Smith, máquinas)
- Progressão: LINEAR obrigatória
- INCLUIR: instruções detalhadas em cada exercício
- Exercícios: máximo 2 padrões de movimento por sessão

## INTERMEDIÁRIO (Média Experiência):
- Máquinas + pesos livres progressivamente
- PODE usar: supersets simples, bi-sets
- Volume: conforme SEÇÃO 1 - faixa INTERMEDIÁRIO
- Progressão de carga estruturada
- Introduzir variações simples de intensidade
- Instruções visuais moderadas

## AVANÇADO (Alta Experiência):
- Exercícios complexos (multiarticulares pesados, unilaterais)
- MÉTODOS AVANÇADOS PERMITIDOS: drop set, cluster, rest-pause, excêntrica forçada
- Volume: conforme SEÇÃO 1 - faixa AVANÇADO
- Progressão: ONDULATÓRIA
- Maior intensidade permitida
- Pode trabalhar próximo à falha muscular
- Menor necessidade de instruções detalhadas

## Autonomia Técnica (nível de detalhamento):
- BAIXA: incluir dicas posturais, ROM específico
- MÉDIA: incluir apenas carga sugerida e observações técnicas
- ALTA: ficha limpa, apenas séries x reps x carga

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 8: ADAPTAÇÕES POR DOR/LESÃO (DETALHADO)
═══════════════════════════════════════════════════════════════════════════════

## JOELHO:
- EVITAR: agachamento profundo, saltos, lunges profundos
- SUBSTITUIR POR: leg press com ROM limitado (não passar de 90°), cadeira extensora ROM parcial
- PRIORIZAR: isométricos, amplitude controlada
- INCLUIR: fortalecimento de VMO, ativação de glúteo médio
- SE DOR EM AGACHAR: leg press, goblet squat raso, ponte de quadril

## OMBRO:
- EVITAR: overhead pesado, supino aberto >90°, mergulho
- SUBSTITUIR POR: desenvolvimentos com ROM controlado (<90°), elevações laterais leves
- PRIORIZAR: rotadores externos, estabilizadores escapulares
- SE DOR OVERHEAD: plano inclinado baixo, lateral raise parcial
- INCLUIR: face pull, rotação externa com elástico

## LOMBAR:
- EVITAR: agachamento livre pesado, stiff com carga alta, deadlift convencional
- SUBSTITUIR POR: leg press, hip thrust, ponte, agachamento no Smith
- PRIORIZAR: core anti-rotacional, estabilização
- SE DOR EM LEVANTAR PESO: máquinas, exercícios sentado
- INCLUIR: bird dog, dead bug, prancha

## CERVICAL:
- EVITAR: exercícios com carga sobre ombros/trapézio (agachamento barra alta)
- PREFERIR: máquinas com apoio, cabos, agachamento com barra baixa ou frontal
- EVITAR: remada alta, encolhimento pesado

## QUADRIL:
- EVITAR: agachamento profundo, abdução pesada, rotações
- SUBSTITUIR POR: leg press, extensora, flexora
- PRIORIZAR: mobilidade de quadril, ativação glútea
- SE DOR EM AGACHAR: box squat raso, leg press

## TORNOZELO/PÉ:
- EVITAR: exercícios de impacto, saltos, corrida
- SUBSTITUIR POR: bike, elíptico, remo
- PRIORIZAR: fortalecimento de panturrilha sentado, tibial
- SE DOR EM CORRER: LISS em bike ou elíptico

## Ajustes Automáticos Gerais:
- Adaptação de AMPLITUDE: limitar ROM conforme região afetada
- Redução de CARGA: manter estímulo com menor carga
- Modificação do MÉTODO: substituir saltos por movimentos de baixo impacto
- Usar ISOMETRIA quando movimento ativo causar dor

## Blocos Preventivos (incluir quando há histórico de dor):
- ATIVAÇÃO: glúteo médio, core profundo, serrátil anterior (1-2 exercícios)
- MOBILIDADE: torácica, tornozelo, quadril (incluir em aquecimento)
- ESTABILIDADE: dead bug, bird dog, ponte unilateral (como finalizador)

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 9: REGRAS DE FOCO EM GRUPAMENTOS
═══════════════════════════════════════════════════════════════════════════════

## Quando há Foco Declarado:
- AUMENTAR: 20-30% o volume semanal do grupamento priorizado
- INSERIR: grupamento no INÍCIO do bloco (posição de maior energia)
- DISTRIBUIR: estímulos ao longo da semana (não concentrar em um dia)
- ESCOLHER: exercícios que maximizem ativação do alvo
- IMPORTANTE: NÃO REDUZIR volume dos demais grupos - manter dentro da faixa mínima

## Exemplos de Priorização:
- FOCO GLÚTEOS: hip thrust ou ponte unilateral PRIMEIRO, aumentar séries em stiff/agachamento/afundo
- FOCO ABDÔMEN: abdominal ou prancha como FINALIZADOR do bloco
- FOCO PEITORAL: supino ou flexões PRIMEIRO no bloco
- FOCO COSTAS: remada ou puxada PRIMEIRO, adicionar exercício unilateral

## Cruzamentos:
- Se há DOR no grupamento priorizado: reduzir carga, priorizar ativação técnica
- Se objetivo é EMAGRECIMENTO: manter foco sem comprometer gasto calórico geral
- Se frequência BAIXA: concentrar foco nas sessões disponíveis
- Se frequência ALTA: distribuir estímulos

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 10: REGRAS DE COMBINAÇÃO DE EQUIPAMENTOS
═══════════════════════════════════════════════════════════════════════════════

## Regras Gerais:
- EVITAR: máquina + máquina em supersets (congestionamento na academia)
- PREFERIR: Máquina + Peso Livre OU Máquina + Peso Corporal
- ORDEM: Multiarticulares SEMPRE antes de monoarticulares
- PRIORIDADE: Grupamento prioritário PRIMEIRO na sessão
- TRANSIÇÃO: evitar deslocamentos excessivos entre exercícios

## Por Nível:
- INICIANTE: máquinas podem compor 70-80% do treino
- INTERMEDIÁRIO: 50% máquinas, 50% pesos livres progressivamente
- AVANÇADO: máquinas para intensificação e isolamento, pesos livres como base

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 11: REGRAS DE CARDIO
═══════════════════════════════════════════════════════════════════════════════

## Tipos:
- LISS (Low Intensity): caminhada, bicicleta leve - 20-40min, FC 50-65% máxima
- MICT (Moderate): corrida moderada, elíptico - 15-30min, FC 65-75% máxima
- HIIT: APENAS para intermediários/avançados - 10-20min, intervalos

## Inserção por Objetivo:
- EMAGRECIMENTO: priorizar cardio quando aceito (2-4x/semana), preferencialmente LISS/MICT
- HIPERTROFIA: cardio REDUZIDO, apenas se solicitado (máx 2x/semana, LISS)
- SAÚDE: cardio moderado como complemento (2-3x/semana, MICT)

## Regras de Duração:
- Tempo total <30 min: cardio curto (5-10 min) ou ausente
- Tempo 30-45 min: cardio 10-15 min opcional
- Tempo >45 min: cardio 20-30 min permitido

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 12: AJUSTES POR SONO E ESTRESSE
═══════════════════════════════════════════════════════════════════════════════

## Sono < 6h OU Estresse Alto:
- REDUZIR: volume em 20-25% (mas NUNCA abaixo do mínimo absoluto para o nível)
- PRIORIZAR: exercícios de baixa complexidade (máquinas)
- PAUSAS: mais longas (+15-30 segundos)
- EVITAR: falha muscular
- EVITAR: métodos avançados (drop set, etc.)
- CARDIO: se incluído, apenas LISS leve

## IMPORTANTE SOBRE REDUÇÃO POR SONO/ESTRESSE:
- Aplicar redução sobre o valor MÉDIO da faixa
- Se faixa é 16-26, e redução é 25%, usar ~15-18 séries (não abaixo de 12)
- JAMAIS prescrever abaixo do mínimo absoluto mesmo com baixa recuperação

## Sono Adequado (7-9h) E Estresse Baixo/Moderado:
- Seguir prescrição normal
- PODE: progredir carga
- PODE: usar métodos de intensificação

## Critérios Objetivos:
- Sono <6h nas últimas 24h → reduzir intensidade
- Estresse auto-reportado "alto" → reduzir volume e complexidade

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 13: MÉTODOS DE INTENSIFICAÇÃO
═══════════════════════════════════════════════════════════════════════════════

## Apenas para Intermediários/Avançados:

### Drop Set:
- Executar série até próximo da falha
- Reduzir carga 20-30% sem descanso
- Repetir 2-3 vezes
- USO: último exercício do grupamento, última série

### Rest-Pause:
- Executar até próximo da falha
- Descansar 10-15 segundos
- Repetir até completar reps-alvo
- USO: exercícios compostos, aumento de densidade

### Bi-Set/Superset:
- 2 exercícios consecutivos sem descanso
- AGONISTA + AGONISTA (mesmo músculo) = bi-set
- AGONISTA + ANTAGONISTA (músculos opostos) = superset
- USO: aumentar densidade, reduzir tempo de treino

### Cluster:
- 4-6 reps com carga pesada
- Descanso 10-15 seg entre reps
- Repetir até completar volume
- USO: desenvolvimento de força, avançados

### Piramidal:
- Aumentar ou diminuir carga a cada série
- Crescente: começar leve, terminar pesado
- Decrescente: começar pesado, terminar leve
- USO: aquecimento + intensidade, ou fadiga acumulada

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 14: CATÁLOGO DE EXERCÍCIOS
═══════════════════════════════════════════════════════════════════════════════

Você receberá uma lista de exercícios disponíveis no catálogo da academia. 
VOCÊ DEVE USAR APENAS OS EXERCÍCIOS DO CATÁLOGO FORNECIDO.
Cada exercício tem: nome, grupo muscular, padrão de movimento, nível de treino e equipamento.

REGRAS DE SELEÇÃO:
- Para INICIANTES: priorizar exercícios com training_level = "Iniciante"
- Para INTERMEDIÁRIOS: pode usar "Iniciante" e "Intermediário"
- Para AVANÇADOS: pode usar todos os níveis
- RESPEITAR o equipamento disponível na academia low-cost

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 15: FORMATO DE SAÍDA JSON
═══════════════════════════════════════════════════════════════════════════════

Você DEVE retornar um JSON válido com a seguinte estrutura EXATA:

{
  "planName": "Nome do plano baseado no objetivo e nível",
  "description": "Descrição personalizada explicando a lógica do plano",
  "weeklyFrequency": numero,
  "sessionDuration": "duração em texto",
  "periodization": "linear" ou "undulating",
  "experienceLevel": "beginner" ou "intermediate" ou "advanced",
  "mainGoal": "objetivo principal traduzido",
  "weeklyVolumeStrategy": "Explicação da estratégia de volume adotada",
  "workouts": [
    {
      "day": "Nome do dia da semana",
      "name": "Nome do treino (ex: Treino A - Push)",
      "focus": "Foco principal do treino",
      "muscleGroups": ["grupo1", "grupo2"],
      "estimatedDuration": "XX min",
      "warmup": {
        "description": "Descrição do aquecimento recomendado",
        "duration": "5-10 min",
        "exercises": ["exercício 1", "exercício 2"]
      },
      "exercises": [
        {
          "order": 1,
          "name": "Nome do exercício DO CATÁLOGO",
          "equipment": "Tipo de equipamento",
          "muscleGroup": "Grupamento principal",
          "sets": 3,
          "reps": "10-12",
          "rest": "60s",
          "intensity": "RPE 7-8 ou % 1RM",
          "notes": "Observações técnicas detalhadas para o nível do usuário",
          "isCompound": true/false,
          "alternatives": ["alternativa 1 se houver dor", "alternativa 2"]
        }
      ],
      "finisher": {
        "type": "core" ou "cardio" ou "stretching" ou null,
        "exercises": ["exercício 1"],
        "duration": "5-10 min"
      },
      "cardio": {
        "type": "LISS/MICT/HIIT ou null",
        "duration": "XX min",
        "intensity": "FC zona ou descrição",
        "notes": "Observações"
      } ou null
    }
  ],
  "weeklyVolume": {
    "chest": X,
    "back": X,
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
    "week1": "Descrição do foco da semana 1",
    "week2": "Descrição do foco da semana 2",
    "week3": "Descrição do foco da semana 3",
    "week4": "Descrição do foco da semana 4",
    "deloadWeek": "Descrição da semana de recuperação"
  },
  "adaptations": {
    "painAreas": ["lista de adaptações feitas por dor/lesão"],
    "sleepStress": "adaptação feita por sono/estresse se aplicável",
    "focusAreas": ["adaptações para áreas prioritárias"]
  },
  "warnings": ["Lista de alertas baseados nas condições de saúde informadas"],
  "motivationalMessage": "Mensagem motivacional personalizada com o nome do usuário",
  "coachNotes": "Notas do treinador virtual sobre pontos de atenção"
}

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 16: REGRAS CRÍTICAS FINAIS
═══════════════════════════════════════════════════════════════════════════════

## OBRIGATÓRIO:
1. Retorne APENAS o JSON, sem texto adicional antes ou depois
2. TODOS os campos são obrigatórios
3. Adapte TODOS os exercícios às condições de saúde reportadas
4. O plano DEVE ser realista e executável em academia low-cost
5. PRIORIZE máquinas para iniciantes (70%+ do treino)
6. RESPEITE todas as variáveis do onboarding sem exceção
7. CALCULE o volume semanal por grupamento e GARANTA que está DENTRO DA FAIXA DO NÍVEL (Seção 1)
8. INCLUA aquecimento e finalizador em cada sessão
9. ADAPTE a complexidade das instruções ao nível de experiência
10. Se há dor/lesão, SEMPRE inclua alternativas nos exercícios
11. USE APENAS EXERCÍCIOS DO CATÁLOGO FORNECIDO
12. VARIE os intervalos de descanso (não use apenas 90s para todos)

## NUNCA:
- Prescreva saltos ou impacto para quem tem dor em joelho/tornozelo
- Prescreva overhead pesado para quem tem dor em ombro
- Use métodos avançados para iniciantes
- Ignore o tempo de sessão disponível
- Prescreva volume ABAIXO do mínimo para o nível (CRÍTICO)
- Prescreva volume ACIMA do máximo para o nível
- Ignore sono ruim ou estresse alto
- Invente exercícios que não estão no catálogo
- Use o mesmo intervalo de descanso para todos os exercícios`;

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
      console.error("Validation error:", validationResult.error.issues);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input data", 
          details: validationResult.error.issues.map(i => i.message).join(", ")
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validatedData = validationResult.data;
    
    // Sanitize health description to prevent prompt injection
    if (validatedData.healthDescription) {
      validatedData.healthDescription = sanitizeForPrompt(validatedData.healthDescription);
    }

    // Fetch exercises from catalog based on user's level
    const userLevel = validatedData.experienceLevel || "beginner";
    const allowedLevels = getAllowedLevels(userLevel);

    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("name, muscle_group, movement_pattern, training_level, equipment")
      .in("training_level", allowedLevels);

    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      throw new Error("Failed to fetch exercise catalog");
    }

    // Build the user prompt with validated and sanitized data
    const userPrompt = buildUserPrompt(validatedData, exercises || []);

    console.log("Calling Lovable AI for user:", userId);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5, // Reduced for more consistent output
        max_tokens: 12000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a few moments." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let workoutPlan;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        workoutPlan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw content:", content);
      throw new Error("Failed to parse workout plan from AI response");
    }

    // === POST-AI VALIDATION ===
    const validationWarnings = validateWorkoutPlan(
      workoutPlan,
      exercises || [],
      {
        trainingDays: validatedData.trainingDays || [],
        injuryAreas: validatedData.injuryAreas || [],
        experienceLevel: validatedData.experienceLevel,
        sleepHours: validatedData.sleepHours,
        stressLevel: validatedData.stressLevel,
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
  
  // Determine BMI category
  let bmiCategory = "normal";
  if (parseFloat(bmi) < 18.5) bmiCategory = "abaixo do peso";
  else if (parseFloat(bmi) >= 25 && parseFloat(bmi) < 30) bmiCategory = "sobrepeso";
  else if (parseFloat(bmi) >= 30) bmiCategory = "obesidade";

  // Get volume ranges for user's level
  const level = userData.experienceLevel || "beginner";
  const volumeRanges = getVolumeRanges(level);
  
  // Calculate if sleep/stress reduction applies
  const sleepHours = parseInt(userData.sleepHours || "7", 10);
  const hasLowRecovery = sleepHours < 6 || userData.stressLevel === "high";

  // Group exercises by muscle group for easier reference
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

  // Build structured injury section
  let healthSection = "";
  if (userData.hasHealthConditions) {
    if (userData.injuryAreas && userData.injuryAreas.length > 0) {
      healthSection = `
## CONDIÇÕES DE SAÚDE E DOR
- Possui condições/lesões: SIM
- REGIÕES AFETADAS: ${userData.injuryAreas.map(getInjuryLabel).join(', ')}
${userData.injuryAreas.map(area => `
### ${getInjuryLabel(area).toUpperCase()}:
- AÇÃO OBRIGATÓRIA: Aplicar regras da Seção 8
- ${getInjuryAdaptationRules(area)}
- INCLUIR ALTERNATIVAS: Obrigatório para cada exercício que possa afetar esta região`).join('\n')}
${userData.healthDescription ? `
- Descrição adicional do usuário: ${sanitizeForPrompt(userData.healthDescription)}` : ''}
- INCLUIR BLOCOS PREVENTIVOS: ativação, mobilidade, estabilidade conforme regiões afetadas`;
    } else if (userData.healthDescription) {
      healthSection = `
## CONDIÇÕES DE SAÚDE E DOR
- Possui condições/lesões: SIM
- Descrição: ${sanitizeForPrompt(userData.healthDescription)}
- AÇÃO OBRIGATÓRIA: Analisar descrição e aplicar adaptações da Seção 8
- Incluir alternativas em exercícios que possam ser afetados`;
    }
  } else {
    healthSection = `
## CONDIÇÕES DE SAÚDE E DOR
- Possui condições/lesões: NÃO
- Sem restrições por dor/lesão`;
  }

  // Build volume requirements section
  const volumeSection = `
## VOLUME OBRIGATÓRIO PARA ESTE USUÁRIO (NÍVEL: ${getExperienceLevelSimple(userData.experienceLevel)})
${hasLowRecovery ? `⚠️ ATENÇÃO: Sono insuficiente/Estresse alto detectado. Aplicar redução de 20-25% sobre o MÉDIO da faixa, mas NUNCA abaixo do mínimo.\n` : ''}

### FAIXAS DE VOLUME SEMANAL OBRIGATÓRIAS:
| Grupamento    | Mínimo | Alvo  | Máximo |
|---------------|--------|-------|--------|
| Peitoral      | ${volumeRanges.large.min} | ${Math.round((volumeRanges.large.min + volumeRanges.large.max) / 2)} | ${volumeRanges.large.max} |
| Costas        | ${volumeRanges.large.min} | ${Math.round((volumeRanges.large.min + volumeRanges.large.max) / 2)} | ${volumeRanges.large.max} |
| Quadríceps    | ${volumeRanges.large.min} | ${Math.round((volumeRanges.large.min + volumeRanges.large.max) / 2)} | ${volumeRanges.large.max} |
| Isquiotibiais | ${volumeRanges.large.min} | ${Math.round((volumeRanges.large.min + volumeRanges.large.max) / 2)} | ${volumeRanges.large.max} |
| Glúteos       | ${volumeRanges.large.min} | ${Math.round((volumeRanges.large.min + volumeRanges.large.max) / 2)} | ${volumeRanges.large.max} |
| Ombros        | ${volumeRanges.medium.min} | ${Math.round((volumeRanges.medium.min + volumeRanges.medium.max) / 2)} | ${volumeRanges.medium.max} |
| Bíceps        | ${volumeRanges.small.min} | ${Math.round((volumeRanges.small.min + volumeRanges.small.max) / 2)} | ${volumeRanges.small.max} |
| Tríceps       | ${volumeRanges.small.min} | ${Math.round((volumeRanges.small.min + volumeRanges.small.max) / 2)} | ${volumeRanges.small.max} |
| Panturrilhas  | ${volumeRanges.small.min} | ${Math.round((volumeRanges.small.min + volumeRanges.small.max) / 2)} | ${volumeRanges.small.max} |
| Core          | ${volumeRanges.small.min} | ${Math.round((volumeRanges.small.min + volumeRanges.small.max) / 2)} | ${volumeRanges.small.max} |

### REGRA CRÍTICA:
- TODOS os grupamentos devem ter volume DENTRO da faixa acima
- Se há área prioritária, aumentar 20-30% o volume DAQUELA área
- NÃO reduzir o volume das outras áreas - manter no mínimo`;

  return `
═══════════════════════════════════════════════════════════════════════════════
                    DADOS COMPLETOS DO USUÁRIO PARA PRESCRIÇÃO
═══════════════════════════════════════════════════════════════════════════════

## IDENTIFICAÇÃO
- Nome: ${userData.name || "Usuário"}
- Gênero: ${getGenderLabel(userData.gender)}
- Idade: ${userData.age || 30} anos
- Altura: ${userData.height || 170} cm
- Peso: ${userData.weight || 70} kg
- IMC: ${bmi} (${bmiCategory})

## OBJETIVO E PRAZO
- Objetivo Principal: ${getGoalLabel(userData.goal)}
- Prazo para Resultados: ${getTimeframeLabel(userData.timeframe)}
- Urgência: ${getUrgencyLevel(userData.timeframe)}

## DISPONIBILIDADE SEMANAL
- Dias de treino por semana: ${userData.trainingDays?.length || 3} dias
- Dias específicos: ${userData.trainingDays?.map((d: string) => getDayLabel(d)).join(', ') || 'Flexível'}
- Duração máxima por sessão: ${getSessionDurationLabel(userData.sessionDuration)}
- Tempo real disponível: ${getSessionMinutes(userData.sessionDuration)} minutos

## PREFERÊNCIAS DE EXERCÍCIO
- Tipos de exercício preferidos: ${userData.exerciseTypes?.join(', ') || 'Máquinas, Pesos Livres'}
- Aceita cardio: ${userData.includeCardio ? 'SIM - incluir cardio conforme objetivo' : 'NÃO - focar apenas em musculação'}
- Nível de experiência: ${getExperienceLabel(userData.experienceLevel)}
- Preferência de variação: ${getVariationLabel(userData.variationPreference)}

## ÁREAS CORPORAIS PRIORITÁRIAS
${userData.bodyAreas?.length > 0 
  ? `- Áreas para priorizar: ${userData.bodyAreas.join(', ')}\n- AÇÃO: Aumentar volume 20-30% APENAS nestas áreas, posicioná-las primeiro no bloco\n- IMPORTANTE: NÃO reduzir volume dos demais grupos - manter todos no mínimo da faixa` 
  : '- Distribuição equilibrada entre todos os grupamentos'}

${healthSection}

## ESTILO DE VIDA E RECUPERAÇÃO
- Horas de sono por noite: ${userData.sleepHours || 7} horas
- Qualidade do sono: ${getSleepQuality(userData.sleepHours)}
- Nível de estresse: ${getStressLabel(userData.stressLevel)}
- Capacidade de recuperação estimada: ${getRecoveryCapacity(userData.sleepHours, userData.stressLevel)}

${getSleepStressAdjustment(userData.sleepHours, userData.stressLevel)}

${volumeSection}

## VARIÁVEIS DERIVADAS (IMPLÍCITAS)
- Autonomia técnica: ${getAutonomyLevel(userData.experienceLevel)}
- Estilo de progressão: ${getProgressionStyle(userData.experienceLevel, userData.variationPreference)}
- Complexidade permitida: ${getComplexityLevel(userData.experienceLevel)}
- Métodos de intensificação: ${getIntensificationMethods(userData.experienceLevel)}

${catalogStr}

═══════════════════════════════════════════════════════════════════════════════
                              INSTRUÇÕES FINAIS
═══════════════════════════════════════════════════════════════════════════════

Com base em TODAS as informações acima, gere um plano de treino completo seguindo RIGOROSAMENTE:

1. As regras de volume para o nível ${getExperienceLevelSimple(userData.experienceLevel)} (CONSULTAR TABELA ACIMA)
2. A divisão de treino adequada para ${userData.trainingDays?.length || 3} dias/semana
3. O tempo máximo de ${getSessionMinutes(userData.sessionDuration)} minutos por sessão
4. TODAS as adaptações necessárias para condições de saúde reportadas
5. Priorização das áreas corporais solicitadas (se houver) SEM REDUZIR as demais
6. Ajustes por sono/estresse conforme indicado (mas NUNCA abaixo do mínimo)
7. Cardio ${userData.includeCardio ? 'INCLUÍDO conforme objetivo' : 'NÃO INCLUÍDO'}
8. Instruções com nível de detalhamento para ${getAutonomyLevel(userData.experienceLevel)} autonomia
9. USE APENAS EXERCÍCIOS DO CATÁLOGO FORNECIDO ACIMA
10. INCLUA ALTERNATIVAS em todos os exercícios quando houver lesão declarada
11. VARIE os intervalos de descanso (60s, 75s, 90s) - não use apenas 90s
12. GARANTA que weeklyVolume tenha TODOS os grupos dentro da faixa obrigatória

O plano deve ser REALISTA, EXECUTÁVEL em academia low-cost, e PERSONALIZADO para este usuário.`;
}

function getGenderLabel(gender: string | null): string {
  const labels: Record<string, string> = {
    female: "Feminino",
    male: "Masculino",
    other: "Outro"
  };
  return labels[gender || "other"] || "Não informado";
}

function getGoalLabel(goal: string | null): string {
  const labels: Record<string, string> = {
    weight_loss: "EMAGRECIMENTO - Aplicar: densidade alta, pausas curtas (30-60s), supersets, reps 12-20, cardio 2-4x/semana",
    hypertrophy: "HIPERTROFIA - Aplicar: volume conforme Seção 1, reps 6-12, pausas 60-90s (VARIAR)",
    health: "SAÚDE E BEM-ESTAR - Aplicar: volume conforme Seção 1, reps 10-15, exercícios funcionais",
    performance: "PERFORMANCE/FORÇA - Aplicar: reps 4-6, pausas longas 2-3min, periodização ondulatória",
  };
  return labels[goal || "health"] || "SAÚDE E BEM-ESTAR";
}

function getTimeframeLabel(timeframe: string | null): string {
  const labels: Record<string, string> = {
    "3months": "3 meses - Progressão ACELERADA, ajustes frequentes",
    "6months": "6 meses - Progressão MODERADA, tempo adequado",
    "12months": "12 meses - Progressão GRADUAL, foco em consistência",
  };
  return labels[timeframe || "6months"] || "6 meses";
}

function getUrgencyLevel(timeframe: string | null): string {
  if (timeframe === "3months") return "ALTA - maximizar estímulos por sessão";
  if (timeframe === "12months") return "BAIXA - priorizar aderência e técnica";
  return "MODERADA - equilíbrio entre resultados e sustentabilidade";
}

function getDayLabel(day: string): string {
  const labels: Record<string, string> = {
    mon: "Segunda", tue: "Terça", wed: "Quarta",
    thu: "Quinta", fri: "Sexta", sat: "Sábado", sun: "Domingo",
  };
  return labels[day] || day;
}

function getSessionDurationLabel(duration: string | null): string {
  const labels: Record<string, string> = {
    "30min": "30 minutos - Aplicar: 4-5 exercícios, supersets OBRIGATÓRIOS, pausas curtas",
    "45min": "45 minutos - Aplicar: 5-6 exercícios (MÍNIMO 5), pausas 60-75s",
    "60min": "60 minutos - Aplicar: 6-8 exercícios (MÍNIMO 6), pausas adequadas, pode incluir cardio",
    "60plus": "+60 minutos - Aplicar: 8-10 exercícios, treino completo com aquecimento e cardio",
  };
  return labels[duration || "45min"] || "45 minutos";
}

function getSessionMinutes(duration: string | null): number {
  const minutes: Record<string, number> = {
    "30min": 30,
    "45min": 45,
    "60min": 60,
    "60plus": 75,
  };
  return minutes[duration || "45min"] || 45;
}

function getExperienceLabel(level: string | null): string {
  const labels: Record<string, string> = {
    beginner: "INICIANTE - Aplicar: 70%+ máquinas, evitar métodos avançados, progressão linear, volume da faixa INICIANTE, instruções detalhadas",
    intermediate: "INTERMEDIÁRIO - Aplicar: 50% máquinas + 50% pesos livres, supersets permitidos, volume da faixa INTERMEDIÁRIO",
    advanced: "AVANÇADO - Aplicar: pesos livres como base, métodos avançados permitidos, volume da faixa AVANÇADO, progressão ondulatória",
  };
  return labels[level || "beginner"] || "INICIANTE";
}

function getExperienceLevelSimple(level: string | null): string {
  const labels: Record<string, string> = {
    beginner: "INICIANTE",
    intermediate: "INTERMEDIÁRIO", 
    advanced: "AVANÇADO",
  };
  return labels[level || "beginner"] || "INICIANTE";
}

function getVariationLabel(variation: string | null): string {
  const labels: Record<string, string> = {
    high: "ALTA - Troca parcial SEMANAL dos exercícios acessórios",
    moderate: "MODERADA - Troca parcial a cada 2 SEMANAS",
    low: "BAIXA - Treino FIXO por 4 semanas, foco em progressão de carga",
  };
  return labels[variation || "moderate"] || "MODERADA";
}

function getStressLabel(stress: string | null): string {
  const labels: Record<string, string> = {
    low: "BAIXO - Pode seguir prescrição normal, progressão permitida",
    moderate: "MODERADO - Monitorar fadiga, manter prescrição padrão",
    high: "ALTO - OBRIGATÓRIO: reduzir volume 20-25% (mas nunca abaixo do mínimo), priorizar exercícios simples, evitar falha muscular",
  };
  return labels[stress || "moderate"] || "MODERADO";
}

function getSleepQuality(hours: string | null): string {
  const h = parseInt(hours || "7", 10);
  if (h < 6) return "INSUFICIENTE - Aplicar reduções (mas manter mínimos)";
  if (h >= 7 && h <= 9) return "ADEQUADO";
  return "BOM";
}

function getRecoveryCapacity(sleepHours: string | null, stressLevel: string | null): string {
  const sleep = parseInt(sleepHours || "7", 10);
  const stress = stressLevel || "moderate";
  
  if (sleep < 6 || stress === "high") return "BAIXA - reduzir volume 20-25% sobre o MÉDIO (nunca abaixo do mínimo absoluto)";
  if (sleep >= 7 && stress === "low") return "ALTA - pode progredir normalmente";
  return "MODERADA - manter prescrição padrão";
}

function getSleepStressAdjustment(sleepHours: string | null, stressLevel: string | null): string {
  const sleep = parseInt(sleepHours || "7", 10);
  const stress = stressLevel || "moderate";
  
  if (sleep < 6 || stress === "high") {
    return `
## ⚠️ AJUSTES OBRIGATÓRIOS POR SONO/ESTRESSE:
- REDUZIR volume em 20-25% SOBRE O VALOR MÉDIO da faixa
- IMPORTANTE: Jamais prescrever abaixo do MÍNIMO absoluto para o nível
- PRIORIZAR exercícios de baixa complexidade (máquinas)
- AUMENTAR pausas em +15-30 segundos
- EVITAR falha muscular em todas as séries
- Se incluir cardio: apenas LISS leve
- EVITAR métodos avançados (drop set, cluster, etc.)`;
  }
  return "- Sem ajustes necessários por sono/estresse";
}

function getAutonomyLevel(level: string | null): string {
  const labels: Record<string, string> = {
    beginner: "BAIXA - incluir dicas posturais, ROM específico em cada exercício",
    intermediate: "MÉDIA - incluir carga sugerida e observações técnicas principais",
    advanced: "ALTA - ficha objetiva, apenas séries x reps x carga",
  };
  return labels[level || "beginner"] || "BAIXA";
}

function getProgressionStyle(level: string | null, variation: string | null): string {
  if (level === "beginner" || variation === "low") return "LINEAR - manter exercícios fixos, aumentar carga progressivamente";
  if (level === "advanced" && variation === "high") return "ONDULATÓRIA - variar intensidade ao longo da semana";
  return "LINEAR COM VARIAÇÕES - base fixa com trocas periódicas";
}

function getComplexityLevel(level: string | null): string {
  const labels: Record<string, string> = {
    beginner: "BAIXA - máximo 2 padrões de movimento por sessão, exercícios guiados",
    intermediate: "MÉDIA - pode incluir exercícios livres com supervisão, supersets simples",
    advanced: "ALTA - exercícios complexos, unilaterais, métodos avançados permitidos",
  };
  return labels[level || "beginner"] || "BAIXA";
}

function getIntensificationMethods(level: string | null): string {
  const labels: Record<string, string> = {
    beginner: "NENHUM - focar em técnica e progressão de carga simples",
    intermediate: "BÁSICOS - supersets, bi-sets apenas",
    advanced: "COMPLETOS - drop set, rest-pause, cluster, excêntrica forçada permitidos",
  };
  return labels[level || "beginner"] || "NENHUM";
}
