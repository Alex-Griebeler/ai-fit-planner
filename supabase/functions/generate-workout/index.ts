import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um prescritor de exercícios físicos altamente qualificado para academias low-cost. Você DEVE gerar planos de treino personalizados seguindo RIGOROSAMENTE TODAS as diretrizes técnicas abaixo. NUNCA ignore uma regra.

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 1: VOLUME SEMANAL POR GRUPAMENTO
═══════════════════════════════════════════════════════════════════════════════

## Faixas de Volume (séries/grupamento/semana):
- RANGE GERAL: 8-30 séries/semana por grupamento muscular
- INICIANTE: 8-12 séries/grupamento/semana
- INTERMEDIÁRIO: 12-18 séries/grupamento/semana
- AVANÇADO: 18-30 séries/grupamento/semana

## Volume por Frequência Semanal:
- 2-3 treinos/semana: 9-15 séries/grupamento/semana
- 4 treinos/semana: 12-18 séries/grupamento/semana
- 5 treinos/semana: 14-20 séries/grupamento/semana
- 6-7 treinos/semana: manter volume mas distribuir para recuperação

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
- HIPERTROFIA: 60-90 segundos
- EMAGRECIMENTO: 30-60 segundos (alta densidade)
- SAÚDE: 45-75 segundos

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 3: NÚMERO DE EXERCÍCIOS POR TEMPO DE SESSÃO
═══════════════════════════════════════════════════════════════════════════════

## Configuração por Duração:
- ATÉ 30 MIN: 4-5 exercícios, usar supersets obrigatório para densidade
- 30-45 MIN: 5-6 exercícios, pausas moderadas
- 45-60 MIN: 6-8 exercícios, pausas adequadas
- +60 MIN: 8-10 exercícios, treino completo

## Regras de Tempo:
- Se tempo <30 min: prioridade para bloco resistido, cardio apenas se solicitado (curto)
- Se tempo 30-45 min: bloco resistido + cardio curto (10-15 min) opcional
- Se tempo >45 min: permite cardio de maior duração (20-30 min)

═══════════════════════════════════════════════════════════════════════════════
                         SEÇÃO 4: DIVISÕES DE TREINO POR FREQUÊNCIA
═══════════════════════════════════════════════════════════════════════════════

## 2-3 treinos/semana:
- OPÇÃO 1: Full Body com variação de foco (empurrar, puxar, inferiores)
- OPÇÃO 2: Divisão funcional - Dia 1 (Inferiores), Dia 2 (Superiores), Dia 3 (Full ou Metabólico)
- Supersets para otimização do tempo quando necessário

## 4 treinos/semana:
- RECOMENDADO: A/B (Superiores e Inferiores alternados)
- ALTERNATIVA: Força + Hipertrofia alternados
- Ideal para recomposição corporal

## 5 treinos/semana:
- Push/Pull/Legs + repetição dos dias mais fracos
- OU divisão por padrões de movimento
- Técnicas avançadas permitidas para intermediários/avançados

## 6 treinos/semana:
- A/B/C ou divisão por valências (força, potência, resistência)
- APENAS para avançados com objetivo de hipertrofia ou performance
- Volume distribuído para permitir recuperação

## 7 treinos/semana:
- OBRIGATÓRIO incluir dia leve ou regenerativo (mobilidade ou cardio leve)
- Alternância de estímulos e intensidades
- Apenas para atletas ou muito avançados

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
- Volume: 12-20 séries/grupamento/semana
- Reps: 6-12 por série
- Intervalo: 60-90 seg
- MÉTODOS PARA INTERMEDIÁRIOS/AVANÇADOS: drop set, rest-pause, bi-set
- Progressão focada em aumento de carga progressivo
- Falha muscular: apenas na última série de cada exercício

## SAÚDE E BEM-ESTAR:
- Volume moderado: 8-14 séries/grupamento/semana
- Reps: 10-15 por série
- Intervalo: 45-75 seg
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
- Volume: 8-12 séries/grupamento/semana
- Sessões com menor complexidade
- Multiarticulares GUIADOS (Smith, máquinas)
- Progressão: LINEAR obrigatória
- INCLUIR: instruções detalhadas em cada exercício
- Exercícios: máximo 2 padrões de movimento por sessão

## INTERMEDIÁRIO (Média Experiência):
- Máquinas + pesos livres progressivamente
- PODE usar: supersets simples, bi-sets
- Volume: 12-18 séries/grupamento/semana
- Progressão de carga estruturada
- Introduzir variações simples de intensidade
- Instruções visuais moderadas

## AVANÇADO (Alta Experiência):
- Exercícios complexos (multiarticulares pesados, unilaterais)
- MÉTODOS AVANÇADOS PERMITIDOS: drop set, cluster, rest-pause, excêntrica forçada
- Volume: 18-30 séries/grupamento/semana
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
- REDUZIR: volume em 20-30%
- PRIORIZAR: exercícios de baixa complexidade (máquinas)
- PAUSAS: mais longas (+30 segundos)
- EVITAR: falha muscular
- EVITAR: métodos avançados (drop set, etc.)
- CARDIO: se incluído, apenas LISS leve

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
7. CALCULE o volume semanal por grupamento e garanta que está dentro da faixa do nível
8. INCLUA aquecimento e finalizador em cada sessão
9. ADAPTE a complexidade das instruções ao nível de experiência
10. Se há dor/lesão, SEMPRE inclua alternativas nos exercícios
11. USE APENAS EXERCÍCIOS DO CATÁLOGO FORNECIDO

## NUNCA:
- Prescreva saltos ou impacto para quem tem dor em joelho/tornozelo
- Prescreva overhead pesado para quem tem dor em ombro
- Use métodos avançados para iniciantes
- Ignore o tempo de sessão disponível
- Prescreva volume acima do nível de experiência
- Ignore sono ruim ou estresse alto
- Invente exercícios que não estão no catálogo`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration is missing");
    }

    // Create Supabase client to fetch exercises
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch exercises from catalog based on user's level
    const userLevel = userData.experienceLevel || "beginner";
    const allowedLevels = getAllowedLevels(userLevel);

    const { data: exercises, error: exercisesError } = await supabase
      .from("exercises")
      .select("name, muscle_group, movement_pattern, training_level, equipment")
      .in("training_level", allowedLevels);

    if (exercisesError) {
      console.error("Error fetching exercises:", exercisesError);
      throw new Error("Failed to fetch exercise catalog");
    }

    // Build the user prompt with all onboarding data
    const userPrompt = buildUserPrompt(userData, exercises || []);

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
        temperature: 0.6,
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

interface Exercise {
  name: string;
  muscle_group: string;
  movement_pattern: string | null;
  training_level: string;
  equipment: string | null;
}

function buildUserPrompt(userData: any, exercises: Exercise[]): string {
  // Calculate BMI
  const heightM = (userData.height || 170) / 100;
  const weight = userData.weight || 70;
  const bmi = (weight / (heightM * heightM)).toFixed(1);
  
  // Determine BMI category
  let bmiCategory = "normal";
  if (parseFloat(bmi) < 18.5) bmiCategory = "abaixo do peso";
  else if (parseFloat(bmi) >= 25 && parseFloat(bmi) < 30) bmiCategory = "sobrepeso";
  else if (parseFloat(bmi) >= 30) bmiCategory = "obesidade";

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
  ? `- Áreas para priorizar: ${userData.bodyAreas.join(', ')}\n- AÇÃO: Aumentar volume 20-30% nestas áreas, inserir primeiro no bloco` 
  : '- Distribuição equilibrada entre todos os grupamentos'}

## CONDIÇÕES DE SAÚDE E DOR
- Possui condições/lesões: ${userData.hasHealthConditions ? 'SIM' : 'NÃO'}
${userData.hasHealthConditions && userData.healthDescription ? `
- Descrição detalhada: ${userData.healthDescription}
- AÇÃO OBRIGATÓRIA: Aplicar TODAS as regras de adaptação da Seção 8 para a região afetada
- Incluir alternativas em cada exercício que possa afetar a região
- Incluir blocos preventivos (ativação, mobilidade, estabilidade)
` : '- Sem restrições por dor/lesão'}

## ESTILO DE VIDA E RECUPERAÇÃO
- Horas de sono por noite: ${userData.sleepHours || 7} horas
- Qualidade do sono: ${getSleepQuality(userData.sleepHours)}
- Nível de estresse: ${getStressLabel(userData.stressLevel)}
- Capacidade de recuperação estimada: ${getRecoveryCapacity(userData.sleepHours, userData.stressLevel)}

${getSleepStressAdjustment(userData.sleepHours, userData.stressLevel)}

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

1. As regras de volume para o nível ${getExperienceLevelSimple(userData.experienceLevel)}
2. A divisão de treino adequada para ${userData.trainingDays?.length || 3} dias/semana
3. O tempo máximo de ${getSessionMinutes(userData.sessionDuration)} minutos por sessão
4. TODAS as adaptações necessárias para condições de saúde reportadas
5. Priorização das áreas corporais solicitadas (se houver)
6. Ajustes por sono/estresse conforme indicado
7. Cardio ${userData.includeCardio ? 'INCLUÍDO conforme objetivo' : 'NÃO INCLUÍDO'}
8. Instruções com nível de detalhamento para ${getAutonomyLevel(userData.experienceLevel)} autonomia
9. USE APENAS EXERCÍCIOS DO CATÁLOGO FORNECIDO ACIMA

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
    hypertrophy: "HIPERTROFIA - Aplicar: volume 12-20 séries/grupo, reps 6-12, pausas 60-90s",
    health: "SAÚDE E BEM-ESTAR - Aplicar: volume moderado 8-14 séries/grupo, reps 10-15, exercícios funcionais",
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
    "45min": "45 minutos - Aplicar: 5-6 exercícios, pausas moderadas, cardio curto opcional",
    "60min": "60 minutos - Aplicar: 6-8 exercícios, pausas adequadas, pode incluir cardio",
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
    beginner: "INICIANTE - Aplicar: 70%+ máquinas, evitar métodos avançados, progressão linear, 8-12 séries/grupo, instruções detalhadas",
    intermediate: "INTERMEDIÁRIO - Aplicar: 50% máquinas + 50% pesos livres, supersets permitidos, 12-18 séries/grupo",
    advanced: "AVANÇADO - Aplicar: pesos livres como base, métodos avançados permitidos, 18-30 séries/grupo, progressão ondulatória",
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
    high: "ALTO - OBRIGATÓRIO: reduzir volume 20-30%, priorizar exercícios simples, evitar falha muscular",
  };
  return labels[stress || "moderate"] || "MODERADO";
}

function getSleepQuality(hours: number | null): string {
  const h = hours || 7;
  if (h < 6) return "INSUFICIENTE - Aplicar reduções";
  if (h >= 7 && h <= 9) return "ADEQUADO";
  return "BOM";
}

function getRecoveryCapacity(sleepHours: number | null, stressLevel: string | null): string {
  const sleep = sleepHours || 7;
  const stress = stressLevel || "moderate";
  
  if (sleep < 6 || stress === "high") return "BAIXA - reduzir volume e intensidade";
  if (sleep >= 7 && stress === "low") return "ALTA - pode progredir normalmente";
  return "MODERADA - manter prescrição padrão";
}

function getSleepStressAdjustment(sleepHours: number | null, stressLevel: string | null): string {
  const sleep = sleepHours || 7;
  const stress = stressLevel || "moderate";
  
  if (sleep < 6 || stress === "high") {
    return `
## ⚠️ AJUSTES OBRIGATÓRIOS POR SONO/ESTRESSE:
- REDUZIR volume em 20-30%
- PRIORIZAR exercícios de baixa complexidade (máquinas)
- AUMENTAR pausas em +30 segundos
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
