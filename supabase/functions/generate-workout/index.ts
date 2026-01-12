import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um prescritor de exercícios físicos altamente qualificado para academias low-cost. Você deve gerar planos de treino personalizados seguindo RIGOROSAMENTE as diretrizes técnicas abaixo.

# VARIÁVEIS DE CONTROLE TÉCNICO

## Volume Semanal por Grupamento
- 8-30 séries/semana por grupamento muscular
- Iniciantes: 8-12 séries/grupamento/semana
- Intermediários: 12-18 séries/grupamento/semana  
- Avançados: 18-30 séries/grupamento/semana

## Número de Repetições por Objetivo
- Força: 4-6 reps (70-85% 1RM)
- Hipertrofia: 6-12 reps (65-80% 1RM)
- Resistência/Emagrecimento: 12-20 reps (50-70% 1RM)
- Saúde: 10-15 reps (60-75% 1RM)

## Intervalo entre Séries
- Força: 90-180 segundos
- Hipertrofia: 60-90 segundos
- Emagrecimento: 30-60 segundos
- Saúde: 45-75 segundos

## Número de Exercícios por Sessão (baseado no tempo)
- Até 30 min: 4-5 exercícios
- 30-45 min: 5-6 exercícios
- 45-60 min: 6-8 exercícios
- +60 min: 8-10 exercícios

# REGRAS POR OBJETIVO

## Emagrecimento
- Densidade alta (pausas curtas, supersets)
- Gasto calórico elevado
- Reps: 12-20 por série
- Intervalo: 30-60 seg
- Cardio: 2-4x/semana integrado
- Métodos permitidos: circuitos, supersets, EMOM
- Periodização: linear ou ondulatória

## Hipertrofia
- Volume: 12-20 séries/grupamento/semana
- Reps: 6-12 por série
- Intervalo: 60-90 seg
- TUT (tempo sob tensão): 40-60 segundos por série
- Métodos: drop set, rest-pause, bi-set (para intermediários/avançados)
- Progressão focada em aumento de carga

## Saúde e Bem-estar
- Volume moderado: 8-14 séries/grupamento/semana
- Reps: 10-15 por série
- Intervalo: 45-75 seg
- Foco em equilíbrio muscular e postura
- Exercícios funcionais e multiarticulares
- Cardio moderado opcional

## Performance
- Força: 4-6 reps, pausas longas (2-3 min)
- Potência: 3-6 reps explosivas
- Resistência: 15-20+ reps
- Periodização ondulatória para avançados
- Métodos específicos: cluster, excêntrica controlada

# REGRAS POR NÍVEL DE EXPERIÊNCIA

## Iniciante (Beginner)
- Priorizar MÁQUINAS e exercícios de autocarga
- Foco em aprendizado técnico e controle motor
- Evitar métodos avançados
- Volume: 8-12 séries/grupamento/semana
- Sessões com menor complexidade
- Multiarticulares guiados (Smith, máquinas)
- Progressão LINEAR
- Incluir instruções detalhadas

## Intermediário
- Máquinas + pesos livres progressivamente
- Introduzir supersets simples
- Volume: 12-18 séries/grupamento/semana
- Progressão de carga estruturada
- Pode usar bi-sets e supersets

## Avançado
- Exercícios complexos (multiarticulares, unilaterais)
- Métodos avançados: drop set, cluster, rest-pause
- Volume: 18-30 séries/grupamento/semana
- Progressão ondulatória
- Maior intensidade permitida

# REGRAS DE FREQUÊNCIA SEMANAL

## 2-3 treinos/semana
- Full Body ou divisão Push/Pull/Legs
- 9-15 séries/grupamento/semana
- Supersets para otimizar tempo

## 4 treinos/semana
- A/B (Superior/Inferior alternados)
- 12-18 séries/grupamento/semana
- Ideal para recomposição corporal

## 5 treinos/semana
- Divisão por padrões (push/pull/legs) ou grupamentos
- 14-20 séries/grupamento/semana
- Técnicas avançadas permitidas

## 6-7 treinos/semana
- A/B/C ou divisão por valências
- Incluir dia regenerativo obrigatório
- Apenas para avançados

# REGRAS DE ADAPTAÇÃO POR DOR/LESÃO

## Joelho
- Evitar: agachamento profundo, saltos
- Substituir por: leg press com ROM limitado, cadeira extensora ROM parcial
- Priorizar: isométricos, amplitude controlada

## Ombro
- Evitar: overhead pesado, supino aberto
- Substituir por: desenvolvimentos com ROM controlado, elevações laterais leves
- Priorizar: rotadores, estabilizadores

## Lombar
- Evitar: agachamento livre pesado, stiff com carga alta, deadlift
- Substituir por: leg press, hip thrust, ponte
- Priorizar: core, estabilização

## Cervical
- Evitar: exercícios com carga sobre ombros/trapézio
- Preferir: máquinas com apoio, cabos

# REGRAS DE COMBINAÇÃO DE EQUIPAMENTOS

- Evitar máquina + máquina em supersets (congestionamento)
- Preferir: Máquina + Peso Livre ou Máquina + Peso Corporal
- Multiarticulares SEMPRE antes de monoarticulares
- Grupamento prioritário primeiro na sessão
- Evitar transições com deslocamentos excessivos

# REGRAS DE CARDIO

- LISS (Low Intensity): caminhada, bicicleta leve - 20-40min
- MICT (Moderate): corrida moderada, elíptico - 15-30min
- HIIT: apenas para intermediários/avançados - 10-20min

Inserção:
- Emagrecimento: priorizar cardio quando aceito (2-4x/semana)
- Hipertrofia: cardio reduzido, apenas se solicitado
- Saúde: cardio moderado como complemento

# REGRAS DE SONO E ESTRESSE

## Sono < 6h ou Estresse Alto
- Reduzir volume em 20-30%
- Priorizar exercícios de baixa complexidade
- Pausas mais longas
- Evitar falha muscular

## Sono adequado e Estresse baixo/moderado
- Seguir prescrição normal
- Pode progredir carga

# FORMATO DE SAÍDA

Você DEVE retornar um JSON válido com a seguinte estrutura exata:

{
  "planName": "Nome do plano baseado no objetivo",
  "description": "Descrição personalizada do plano",
  "weeklyFrequency": numero,
  "sessionDuration": "duração em texto",
  "periodization": "linear" ou "undulating",
  "workouts": [
    {
      "day": "Nome do dia",
      "name": "Nome do treino (ex: Treino A - Push)",
      "focus": "Foco principal",
      "muscleGroups": ["grupo1", "grupo2"],
      "estimatedDuration": "XX min",
      "exercises": [
        {
          "order": 1,
          "name": "Nome do exercício",
          "equipment": "Tipo de equipamento",
          "sets": 3,
          "reps": "10-12",
          "rest": "60s",
          "tempo": "2-0-2",
          "notes": "Observações técnicas",
          "isCompound": true/false
        }
      ],
      "cardio": {
        "type": "LISS/MICT/HIIT ou null",
        "duration": "XX min",
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
  "progressionPlan": "Descrição de como progredir nas próximas semanas",
  "warnings": ["Lista de alertas baseados nas condições de saúde informadas"],
  "motivationalMessage": "Mensagem motivacional personalizada com o nome do usuário"
}

IMPORTANTE:
- Retorne APENAS o JSON, sem texto adicional
- Todos os campos são obrigatórios
- Adapte TODOS os exercícios às condições de saúde reportadas
- O plano deve ser REALISTA e executável em academia low-cost
- Priorize exercícios em MÁQUINAS para iniciantes
- Respeite TODAS as variáveis do onboarding`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the user prompt with all onboarding data
    const userPrompt = `Gere um plano de treino personalizado para o seguinte usuário:

## DADOS DO USUÁRIO

**Nome:** ${userData.name}
**Gênero:** ${userData.gender === 'female' ? 'Feminino' : userData.gender === 'male' ? 'Masculino' : 'Outro'}
**Idade:** ${userData.age} anos
**Altura:** ${userData.height} cm
**Peso:** ${userData.weight} kg

## OBJETIVO E PRAZO

**Objetivo Principal:** ${getGoalLabel(userData.goal)}
**Prazo:** ${getTimeframeLabel(userData.timeframe)}

## DISPONIBILIDADE

**Dias de treino por semana:** ${userData.trainingDays?.length || 0} dias
**Dias selecionados:** ${userData.trainingDays?.map((d: string) => getDayLabel(d)).join(', ') || 'Não informado'}
**Duração da sessão:** ${getSessionDurationLabel(userData.sessionDuration)}

## PREFERÊNCIAS

**Tipos de exercício preferidos:** ${userData.exerciseTypes?.join(', ') || 'Todos'}
**Inclui cardio:** ${userData.includeCardio ? 'Sim' : 'Não'}
**Nível de experiência:** ${getExperienceLabel(userData.experienceLevel)}
**Preferência de variação:** ${getVariationLabel(userData.variationPreference)}

## ÁREAS CORPORAIS PRIORITÁRIAS

${userData.bodyAreas?.length > 0 ? userData.bodyAreas.join(', ') : 'Distribuição equilibrada'}

## SAÚDE

**Possui condições de saúde/lesões:** ${userData.hasHealthConditions ? 'Sim' : 'Não'}
${userData.hasHealthConditions && userData.healthDescription ? `**Descrição:** ${userData.healthDescription}` : ''}

## ESTILO DE VIDA

**Horas de sono por noite:** ${userData.sleepHours || 'Não informado'}
**Nível de estresse:** ${getStressLabel(userData.stressLevel)}

---

Com base em TODAS essas informações, gere um plano de treino completo seguindo rigorosamente as diretrizes técnicas do sistema. O plano deve ser personalizado, realista e adequado para academia low-cost.`;

    console.log("Calling Lovable AI with user data:", userData.name);

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
        temperature: 0.7,
        max_tokens: 8000,
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
      // Try to extract JSON from the response
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

    console.log("Successfully generated workout plan for:", userData.name);

    return new Response(
      JSON.stringify({ plan: workoutPlan }),
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

// Helper functions
function getGoalLabel(goal: string | null): string {
  const labels: Record<string, string> = {
    weight_loss: "Emagrecimento - Foco em densidade alta, gasto calórico elevado, supersets",
    hypertrophy: "Hipertrofia - Foco em volume, tempo sob tensão, progressão de carga",
    health: "Saúde e Bem-estar - Foco em equilíbrio, funcionalidade, postura",
    performance: "Performance - Foco em força, potência, especificidade",
  };
  return labels[goal || "health"] || "Saúde e Bem-estar";
}

function getTimeframeLabel(timeframe: string | null): string {
  const labels: Record<string, string> = {
    "3months": "3 meses - Progressão acelerada",
    "6months": "6 meses - Progressão moderada",
    "12months": "12 meses - Progressão gradual sustentável",
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

function getSessionDurationLabel(duration: string | null): string {
  const labels: Record<string, string> = {
    "30min": "30 minutos - 4-5 exercícios, supersets para densidade",
    "45min": "45 minutos - 5-6 exercícios, pausas moderadas",
    "60min": "60 minutos - 6-8 exercícios, pausas adequadas",
    "60plus": "+60 minutos - 8-10 exercícios, treino completo",
  };
  return labels[duration || "45min"] || "45 minutos";
}

function getExperienceLabel(level: string | null): string {
  const labels: Record<string, string> = {
    beginner: "Iniciante - Priorizar MÁQUINAS, aprendizado técnico, evitar métodos avançados",
    intermediate: "Intermediário - Máquinas + pesos livres, supersets simples permitidos",
    advanced: "Avançado - Exercícios complexos, métodos avançados, alta intensidade",
  };
  return labels[level || "beginner"] || "Iniciante";
}

function getVariationLabel(variation: string | null): string {
  const labels: Record<string, string> = {
    high: "Alta variação - Troca parcial semanal",
    moderate: "Variação moderada - Troca parcial a cada 2 semanas",
    low: "Baixa variação - Fixo por 4 semanas, foco em progressão de carga",
  };
  return labels[variation || "moderate"] || "Variação moderada";
}

function getStressLabel(stress: string | null): string {
  const labels: Record<string, string> = {
    low: "Baixo - Pode seguir prescrição normal",
    moderate: "Moderado - Monitorar fadiga",
    high: "Alto - Reduzir volume 20-30%, priorizar exercícios simples, evitar falha",
  };
  return labels[stress || "moderate"] || "Moderado";
}
