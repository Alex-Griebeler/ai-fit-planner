# Diretrizes de Prescrição de Treinos - Versão 1.0

**Data:** 2026-01-30  
**Status:** Baseline de Referência  
**Fonte:** `supabase/functions/generate-workout/index.ts` (3.791 linhas)

---

## Introdução

Este documento consolida TODAS as regras de prescrição atualmente implementadas na Edge Function `generate-workout`. Serve como:

1. **Baseline de referência** para comparar antes/depois de qualquer mudança
2. **Documentação oficial** das regras técnicas do sistema
3. **Fonte de verdade** para validação de ajustes futuros

---

## Seção 1: Cálculo de Volume Semanal

### 1.1 Método de Interseção

O volume semanal (séries por grupamento) é determinado pela **INTERSEÇÃO** de duas tabelas:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INTERSEÇÃO FREQUÊNCIA × OBJETIVO                 │
├─────────────────────────────────────────────────────────────────────┤
│  1. Determinar range por FREQUÊNCIA SEMANAL                        │
│  2. Determinar range por OBJETIVO                                  │
│  3. VOLUME FINAL = max(freq.min, obj.min) a min(freq.max, obj.max) │
│                                                                     │
│  Exemplo: 3 dias + Hipertrofia                                     │
│  Frequência: 6-15 | Objetivo: 10-25                                │
│  Final: max(6,10) a min(15,25) = 10-15 séries/grupo/semana         │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Tabela de Frequência (séries/semana por grupo)

**Constante:** `FREQUENCY_VOLUME_RANGES` (linhas 119-127)

| Frequência | Mínimo | Máximo | Split Recomendado |
|------------|--------|--------|-------------------|
| 1 dia/sem  | 4      | 10     | Full Body Único |
| 2 dias/sem | 4      | 12     | Full Body A/B |
| 3 dias/sem | 6      | 15     | Full Body ou FB + A/B |
| 4 dias/sem | 8      | 18     | Upper/Lower A/B |
| 5 dias/sem | 10     | 20     | Híbrido |
| 6 dias/sem | 12     | 20     | PPL 2x |
| 7 dias/sem | 12     | 20     | PPL 2x + Especialização |

### 1.3 Tabela de Objetivo (séries/semana por grupo)

**Constante:** `GOAL_VOLUME_RANGES` (linhas 130-135)

| Objetivo      | Mínimo | Máximo | Característica |
|---------------|--------|--------|----------------|
| weight_loss   | 8      | 20     | Alta densidade, pausas curtas |
| hypertrophy   | 10     | 25     | Volume máximo, progressão de carga |
| health        | 6      | 14     | Submáximo, foco em técnica |
| performance   | 8      | 18     | Foco em intensidade |

### 1.4 Séries por Treino (conforme duração)

**Constante:** `SESSION_SETS_PER_WORKOUT` (linhas 139-144)

| Duração  | Séries/Treino (min) | Séries/Treino (max) | Exercícios |
|----------|---------------------|---------------------|------------|
| 30 min   | 12                  | 18                  | 4-6 |
| 45 min   | 19                  | 24                  | 5-7 |
| 60 min   | 25                  | 30                  | 6-8 |
| 60+ min  | 28                  | 36                  | 7-10 |

---

## Seção 2: Multiplicadores de Ajuste

**Função:** `calculateVolumeRanges` (linhas 564-670)

### 2.1 Multiplicador por Nível de Experiência

**Constante:** `levelMultipliers` (linhas 597-601)

| Nível        | Multiplicador | Justificativa |
|--------------|---------------|---------------|
| Iniciante    | ×0.85         | Adaptação ao treino |
| Intermediário| ×1.00         | Padrão (referência) |
| Avançado     | ×1.10         | Maior tolerância ao volume |

### 2.2 Multiplicador por Recuperação

**Função:** `hasLowRecovery` (linhas 546-552)

| Condição | Multiplicador | Gatilho |
|----------|---------------|---------|
| Recuperação Normal | ×1.00 | Sono ≥6h E Estresse ≤ moderado |
| Recuperação Baixa  | ×0.90 | Sono <6h OU Estresse alto |

**Mapeamento de Sono:**
- `less5`: 4 horas → baixa recuperação
- `5-6`: 5 horas → baixa recuperação  
- `6-7`: 6 horas → recuperação normal
- `7-8`: 7 horas → recuperação normal
- `more8`: 9 horas → recuperação normal

### 2.3 Learning Context V2 (Fase 2)

**Constante:** `LEARNING_CONTEXT_V2_FLAGS` (linhas 2997-3002)

| Configuração | Valor Atual | Descrição |
|--------------|-------------|-----------|
| enabled      | true        | Sistema ativo |
| loggingOnly  | false       | Ajustes aplicados |
| maxAdjustment| 0.15        | ±15% máximo |
| minSessions  | 5           | Mínimo para ativar |

**Range do volumeMultiplier:** 0.85 a 1.15

---

## Seção 3: Volumes Mínimos Absolutos por Objetivo

**Constante:** `goalMinVolumes` (linhas 637-642)

| Grupamento | Hipertrofia | Emagrecimento | Saúde | Performance |
|------------|-------------|---------------|-------|-------------|
| **Grande** (peito, costas, quads, hams, glúteos) | 10 | 8 | 6 | 8 |
| **Médio** (ombros, cintura escapular) | 6 | 6 | 4 | 6 |
| **Pequeno** (bíceps, tríceps, panturrilha, core) | 6 | 4 | 4 | 6 |

**Classificação de Grupos Musculares:**

```typescript
// Função: getMuscleCategory (linhas 672-679)
large:  ["chest", "back", "quadriceps", "hamstrings", "glutes"]
medium: ["shoulders", "scapular_belt"]
small:  ["biceps", "triceps", "calves", "core"]
```

---

## Seção 4: Tempo por Sessão

### 4.1 Tempo Médio por Série (execução + descanso)

**Constante:** `TIME_PER_SET_BY_GOAL` (linhas 426-431)

| Objetivo     | Segundos/Série | Composição |
|--------------|----------------|------------|
| weight_loss  | 85s            | 40s execução + 45s descanso |
| hypertrophy  | 135s           | 45s execução + 90s descanso |
| health       | 100s           | 40s execução + 60s descanso |
| performance  | 170s           | 50s execução + 120s descanso |

**Tolerância:** ±15% (`SESSION_TIME_TOLERANCE = 0.15`)

### 4.2 Estratégia de Aquecimento

**Constante:** `WARMUP_STRATEGY` (linhas 447-476)

| Duração  | Tipo | Séries | Intensidade | Tempo |
|----------|------|--------|-------------|-------|
| 30 min   | Específico | 1 | 60-70% carga | 2 min |
| 45 min   | Específico | 2 | 60-70% carga | 3 min |
| 60 min   | Geral + Específico | 2 | 50-70% progressivo | 5 min |
| 60+ min  | Geral + Específico | 2 | 50-70% progressivo | 5 min |

---

## Seção 5: Regras de Divisão de Treino (Splits)

### 5.1 Análise de Padrão de Dias

**Função:** `analyzeDayPattern` (linhas 170-222)

O sistema detecta automaticamente o padrão dos dias selecionados:

| Padrão | Descrição | Exemplo |
|--------|-----------|---------|
| `alternating` | Nenhum dia consecutivo | Seg, Qua, Sex |
| `consecutive` | Todos os dias consecutivos | Seg, Ter, Qua |
| `mixed` | Combinação de alternados e consecutivos | Seg, Ter, Qui |

### 5.2 Regras de Split por Padrão

**Constante:** `SPLIT_RULES_BY_PATTERN` (linhas 232-305)

#### 3 dias/semana

| Padrão | Split | Estrutura |
|--------|-------|-----------|
| alternating | Full Body 3x | FB A, FB B, FB C |
| consecutive | Empurrar/Puxar/Pernas | Push, Pull, Legs |
| mixed | Full Body + A/B | FB, Superior, Inferior |

#### 4 dias/semana

| Padrão | Split | Estrutura |
|--------|-------|-----------|
| alternating | Superior/Inferior 2x | Sup A, Inf A, Sup B, Inf B |
| consecutive | Superior/Inferior 2x | Sup A, Inf A, Sup B, Inf B |
| mixed | Superior/Inferior 2x | Sup A, Inf A, Sup B, Inf B |

#### 5 dias/semana

| Padrão | Split | Estrutura |
|--------|-------|-----------|
| Todos | Híbrido | Superior, Inferior, Empurrar, Puxar, Pernas |

#### 6 dias/semana

| Padrão | Split | Estrutura |
|--------|-------|-----------|
| Todos | PPL 2x | Push A, Pull A, Legs A, Push B, Pull B, Legs B |

### 5.3 Preferência de Split do Usuário (3x/semana, Intermediário+)

**Função:** `getSplitRule` (linhas 326-359)

| Preferência | Split Resultante |
|-------------|-----------------|
| fullbody | Full Body 3x |
| push_pull_legs | Empurrar/Puxar/Pernas |
| hybrid | Full Body + Push/Pull Híbrido |
| no_preference | Full Body 3x (Variedade Máxima - sem repetição de exercícios) |

---

## Seção 6: Periodização Dinâmica

**Função:** `determinePeriodization` (linhas 698-784)

### 6.1 Regra Base

| Frequência | Nível | Tipo de Periodização |
|------------|-------|----------------------|
| ≤3 dias/sem | Todos | Linear |
| ≥4 dias/sem | Iniciante | Linear |
| ≥4 dias/sem | Intermediário | Linear + Ondulatória |
| ≥4 dias/sem | Avançado | Linear + Ondulatória |

### 6.2 Periodização Linear

```
Semana 1: Adaptação - 60-70% do esforço máximo
Semana 2: Acumulação - 70-80% do esforço
Semana 3: Intensificação - 80-90% do esforço
Semana 4: Pico - 85-95% do esforço
Semana 5: Deload - 50-60% do volume
```

### 6.3 Periodização Linear + Ondulatória (Hipertrofia)

```
Sessão A (Força): 6-8 reps, descanso 2-3min, carga alta
Sessão B (Hipertrofia): 8-12 reps, descanso 60-90s, carga moderada
Sessão C (Metabólico): 12-15 reps, descanso 45-60s, carga leve-moderada
```

**Progressão semanal:** +2.5% na carga OU +1 rep por sessão  
**Deload (Semana 4-5):** Reduzir volume 40%, manter intensidade

---

## Seção 7: Faixas de Repetições e Intensidade

### 7.1 Formato de Intensidade: RR (Repetições de Reserva)

**Definição:** Quantas repetições PODERIA fazer além das prescritas antes de falhar.

| RR | Significado |
|----|-------------|
| 1-2 RR | Alta intensidade (1-2 reps da falha) |
| 2-3 RR | Moderado-alta |
| 3-4 RR | Moderado |

### 7.2 Faixas por Objetivo

#### Hipertrofia (linhas 1730-1737)

| Faixa | Reps | RR | Descanso | Quando Usar |
|-------|------|-----|----------|-------------|
| Força-Hipert | 6-8 | 1-2 RR | 2-3 min | Compostos principais, avançados |
| Hipertrofia | 8-12 | 2-3 RR | 90-120s | Compostos e isoladores primários |
| Metabólico | 12-15 | 2-4 RR | 60-90s | Isoladores, acabamento |
| Alto Rep | 15-20 | 3-4 RR | 45-60s | Panturrilhas, finalizadores |

#### Força (apenas performance) (linhas 1739-1742)

| Faixa | Reps | RR | Descanso |
|-------|------|-----|----------|
| Força Máxima | 2-4 | 1-2 RR | 3-5 min |
| Força-Hipert | 4-6 | 1-2 RR | 2-4 min |

#### Emagrecimento (linhas 1745-1748)

| Faixa | Reps | RR | Descanso |
|-------|------|-----|----------|
| Circuito | 12-15 | 3-4 RR | 30-45s |
| Metabólico | 15-20 | 3-5 RR | 30-60s |

#### Saúde (linhas 1751-1753)

| Faixa | Reps | RR | Descanso |
|-------|------|-----|----------|
| Geral | 10-15 | 3-4 RR | 45-75s |

### 7.3 Intervalos Dinâmicos por Faixa de Repetições

**SYSTEM_PROMPT (linhas 1759-1767)**

| Repetições | Descanso Mínimo | Descanso Máximo | Aplicação |
|------------|-----------------|-----------------|-----------|
| 2-6 reps   | 2 min           | 4 min           | Força, compostos pesados |
| 6-8 reps   | 90s             | 3 min           | Força-hipertrofia |
| 8-12 reps  | 60s             | 2 min           | Hipertrofia clássica |
| 12-15 reps | 45s             | 90s             | Metabólico, isoladores |
| 15-20 reps | 30s             | 60s             | Alto rep, circuitos |

### 7.4 Regra para Iniciantes

**SEMPRE usar 3-4 RR** (nunca treinar até falha)  
Foco em técnica, não em intensidade máxima.

---

## Seção 8: Ordem de Exercícios

### 8.1 Hierarquia por Tipo (6 Níveis)

**SYSTEM_PROMPT (linhas 2085-2176)**

#### Nível 1 - Tipo de Exercício

| Prioridade | Tipo | Exemplos |
|------------|------|----------|
| 1º | Multiarticulares Pesados | Agachamento, Supino, Levantamento Terra |
| 2º | Multiarticulares Secundários | Desenvolvimento, Remada |
| 3º | Monoarticulares | Rosca, Tríceps, Leg Curl |

#### Nível 2 - Demanda Energética

- Alta demanda → início da sessão (grandes grupos musculares)
- Baixa demanda → final da sessão (isoladores, core)

#### Nível 3 - Agrupamento Obrigatório (CRÍTICO)

**REGRA:** TODOS os exercícios de um grupo muscular devem vir JUNTOS, ANTES de passar para o próximo grupo.

```
❌ ERRADO:  Supino → Desenvolvimento → Supino Inclinado → Elevação Lateral
✅ CORRETO: Supino → Supino Inclinado → Desenvolvimento → Elevação Lateral
```

| Tipo de Sessão | Ordem de Grupos |
|----------------|-----------------|
| EMPURRAR | TODOS de Peitoral → TODOS de Ombros → TODOS de Tríceps |
| PUXAR | TODOS de Costas → TODOS de Cintura Escapular → TODOS de Bíceps |
| PERNAS | TODOS de Quadríceps → TODOS de Posteriores → TODOS de Glúteos → Panturrilhas |
| SUPERIOR | TODOS de Peito → TODOS de Costas → TODOS de Ombros → TODOS de Braços |
| INFERIOR | TODOS de Quadríceps → TODOS de Isquiotibiais → TODOS de Glúteos → Panturrilhas |
| FULL BODY | Grandes grupos (Pernas/Costas/Peito) → Ombros → Braços → Core |

#### Nível 4 - Posicionamento Especial

| Grupo | Posição | Motivo |
|-------|---------|--------|
| Core (Abdômen/Lombar) | SEMPRE ao final | Estabiliza em todos os exercícios |
| Cintura Escapular | APÓS exercícios principais de Costas | Ordem lógica da cadeia |
| Panturrilhas | Último grupo de pernas | Menor prioridade neural |

#### Nível 5 - Por Objetivo

| Objetivo | Ajuste de Ordem |
|----------|-----------------|
| HIPERTROFIA | Grupo prioritário no 1º ou 2º exercício |
| EMAGRECIMENTO | Multiarticulares ocupam 70%+ da sessão, no início |
| FORÇA | Composto principal SEMPRE primeiro |
| SAÚDE | Distribuição equilibrada |

#### Nível 6 - Por Nível de Usuário

| Nível | Ajuste |
|-------|--------|
| INICIANTE | Máquinas primeiro (70%+), pesos livres depois |
| INTERMEDIÁRIO | 50% livre + 50% máquina, livre primeiro |
| AVANÇADO | Pesos livres primeiro (maior demanda técnica) |

### 8.2 Regras Críticas de Ordem

1. NUNCA alternar entre grupos musculares - agrupar TODOS antes de mudar
2. NUNCA colocar Core antes de exercícios compostos pesados
3. NUNCA colocar isoladores de braço antes de compostos que usam braços
4. NUNCA iniciar sessão de pernas com panturrilha
5. SE grupo é prioridade do usuário → posicioná-lo entre exercícios 1-3

---

## Seção 9: Proporção Costas/Peitoral

**SYSTEM_PROMPT (linhas 2248-2277)**

### 9.1 Regra de Equilíbrio Postural (Pull/Push Ratio)

| Cenário | Proporção Alvo | Exemplo |
|---------|----------------|---------|
| Sem prioridade de peitoral | 1.10:1 a 1.25:1 (Costas > Peitoral) | Peitoral = 12 séries → Costas = 14-15 séries |
| Peitoral é prioridade | 1:1 (igualar volumes) | Peitoral = 14 séries → Costas = 14 séries |

### 9.2 Classificação de Exercícios

**Exercícios de PUXAR (contabilizar para Costas):**
- Puxadas (todas variações)
- Remadas (exceto abertas = Cintura Escapular)
- Pullover

**Exercícios de EMPURRAR (contabilizar para Peitoral):**
- Supino (todas variações)
- Crucifixo frontal

**NÃO entram na conta:**
- Desenvolvimento e elevações de ombro
- Deltóide posterior (Cintura Escapular)

---

## Seção 10: Cintura Escapular (Obrigatória)

**SYSTEM_PROMPT (linhas 2223-2247)**

### 10.1 Importância

A Cintura Escapular (deltóide posterior, trapézio médio, romboides) é ESSENCIAL para:
- Equilíbrio postural
- Prevenção de lesões no ombro
- Estabilidade escapular

### 10.2 Regras Obrigatórias

| Parâmetro | Valor |
|-----------|-------|
| Frequência mínima | 1 exercício/semana |
| Volume | 8-14 séries/semana (grupo médio) |
| Posicionamento | Dias de Costas ou Puxar, após Grande Dorsal |

### 10.3 Exercícios do Catálogo

- Crucifixo inverso (pegada pronada ou romana)
- Remada pegada aberta (banco alto, cabo ou máquina)
- Face Pull (se disponível)

---

## Seção 11: Adaptações por Lesão

**SYSTEM_PROMPT (linhas 2183-2212)**

### 11.1 Ombro

| Ação | Exercícios |
|------|------------|
| EVITAR | Overhead pesado, supino inclinado, pullover |
| SUBSTITUIR | Plano horizontal, cabos, máquinas guiadas |
| INCLUIR | Rotadores externos, face pull |

### 11.2 Lombar

| Ação | Exercícios |
|------|------------|
| EVITAR | Stiff pesado, remada curvada, agachamento livre |
| SUBSTITUIR | Leg press, hip thrust, máquinas sentado |
| INCLUIR | Core anti-rotacional, dead bug, prancha |

### 11.3 Cervical

| Ação | Exercícios |
|------|------------|
| EVITAR | Carga sobre ombros, encolhimento pesado |
| PREFERIR | Máquinas com apoio, cabos |

### 11.4 Joelho

| Ação | Exercícios |
|------|------------|
| EVITAR | Agachamento profundo, leg press profundo, extensora pesada |
| SUBSTITUIR | Amplitude controlada, isométricos |
| PREFERIR | Máquinas com controle de ROM |

### 11.5 Quadril

| Ação | Exercícios |
|------|------------|
| EVITAR | Agachamento profundo, adução/abdução pesada |
| SUBSTITUIR | Leg press, ponte, ativação glútea |

### 11.6 Tornozelo/Pé

| Ação | Exercícios |
|------|------------|
| EVITAR | Impacto, saltos, corrida |
| SUBSTITUIR | Bike, elíptico, remo |

---

## Seção 12: Estratégia de Alta Densidade (30min)

**Função:** `calculateDensityStrategy` (linhas 491-531)

### 12.1 Condições de Ativação

| Condição | Valor |
|----------|-------|
| Duração | 30min OU 45min |
| Objetivo | hypertrophy OU weight_loss |
| Resultado | `needsHighDensity = true` |

### 12.2 Regras de Alta Densidade

| Parâmetro | Regra 30min | Regra 45min+ |
|-----------|-------------|--------------|
| Isoladores | APENAS se usuário pediu áreas específicas | Flexível |
| Prioridade | Grupos grandes (70%+) | Equilibrada |
| Aquecimento | 1 série específica (60-70% carga) | 1-2 séries |

### 12.3 Capacidade Realista por Sessão

| Duração | Séries Mínimas | Séries Máximas |
|---------|----------------|----------------|
| 30 min  | 12             | 14 |
| 45 min  | 18             | 22 |
| 60 min  | 24             | 28 |
| 60+ min | 28             | 34 |

---

## Seção 13: Learning Context V2

**Função:** `buildLearningContextV2` (linhas 3159-3258)

### 13.1 Métricas Coletadas

| Métrica | Fonte | Cálculo |
|---------|-------|---------|
| avgRpe | workout_sessions.perceived_effort | Média das últimas 10 sessões |
| rpeStdDev | workout_sessions.perceived_effort | Desvio padrão |
| completionRate | completed_sets / total_sets | Proporção de séries completadas |
| avgSessionDuration | workout_sessions.duration_minutes | Média em minutos |
| actualFrequency | Contagem de sessões / semanas | Dias reais de treino |

### 13.2 Cálculo do volumeMultiplier

**Função:** `calculateVolumeAdjustment` (linhas 3078-3157)

#### Ajuste por Frequência Real

| Frequência Real vs Planejada | Ajuste |
|------------------------------|--------|
| <70% do planejado | +5% (compensar por sessão) |
| >120% do planejado | -8% (distribuir volume) |

#### Ajuste por RPE

| RPE Médio | Ajuste | Ação |
|-----------|--------|------|
| ≥9.0 | -15% | Deload recomendado |
| ≥8.5 | -10% | Reduzir volume |
| ≤5.5 | +5% | Aumentar |

#### Ajuste por Taxa de Conclusão

| Taxa | Ajuste |
|------|--------|
| <70% | -15% |
| <80% | -5% |
| ≥95% + RPE <7 | +5% |

### 13.3 Guardrails de Segurança

| Parâmetro | Valor |
|-----------|-------|
| Ajuste máximo | ±15% |
| Sessões mínimas | 5 |
| Range final do multiplier | 0.85 a 1.15 |

### 13.4 Flags de Bloqueio

O sistema **NÃO aplica** ajustes quando:
- Menos de 5 sessões registradas
- Modo `loggingOnly` ativo (atualmente false)

---

## Seção 14: Variação de Exercícios

**SYSTEM_PROMPT (linhas 2295-2346)**

### 14.1 Níveis de Variação

| Preferência | Acessórios | Base | Dentro da Semana |
|-------------|------------|------|------------------|
| high | Trocar a cada semana | Manter 2-3 semanas | Variações diferentes |
| moderate | Trocar a cada 2 semanas | Manter 3-4 semanas | Pode repetir |
| low | Manter 4+ semanas | Manter 4+ semanas | Repetir é aceitável |

### 14.2 Regra Especial: Variedade Máxima

Quando `splitPreference = no_preference` em 3 dias:
- **NENHUM exercício pode repetir na semana**
- Cada dia usa exercícios DIFERENTES para o mesmo grupamento

---

## Seção 15: Métodos de Intensificação

**SYSTEM_PROMPT (linhas 2349-2362)**

### 15.1 Métodos Disponíveis

| Método | Descrição | Aplicação |
|--------|-----------|-----------|
| Drop Set | Série até falha, reduz 20-30%, repete 2-3x | Última série |
| Rest-Pause | Série até falha, 10-15s pausa, continua | Última série |
| Superset | 2 exercícios consecutivos sem pausa | Antagonistas |
| Cluster | 4-6 reps com pausa 10-15s entre reps | Força |

### 15.2 Restrições

| Nível | Permissão |
|-------|-----------|
| Iniciante | **NUNCA** usar métodos avançados |
| Intermediário+ | Máximo 2-3 métodos por sessão, apenas última série |

---

## Seção 16: Cardio

**SYSTEM_PROMPT (linhas 2365-2407)**

### 16.1 Tipos de Cardio

| Tipo | Duração | Intensidade | Indicação |
|------|---------|-------------|-----------|
| LISS | 20-40min | FC 50-65% máxima | Todos os níveis, ideal para hipertrofia |
| MICT | 15-30min | FC 65-75% máxima | Intermediários+, saúde geral |
| HIIT | 10-20min | Séries intensas | APENAS intermediários/avançados |

### 16.2 Prescrição por Objetivo

| Objetivo | Frequência | Tipo Preferencial |
|----------|------------|-------------------|
| Emagrecimento | 2-4x/semana | LISS ou MICT |
| Hipertrofia | Máx 2x/semana | APENAS LISS |
| Saúde | 2-3x/semana | MICT |
| Performance | Conforme esporte | Variado |

---

## Apêndice A: Constantes de Referência

### Arquivos e Linhas

| Constante | Arquivo | Linhas |
|-----------|---------|--------|
| FREQUENCY_VOLUME_RANGES | index.ts | 119-127 |
| GOAL_VOLUME_RANGES | index.ts | 130-135 |
| SESSION_SETS_PER_WORKOUT | index.ts | 139-144 |
| TIME_PER_SET_BY_GOAL | index.ts | 426-431 |
| WARMUP_STRATEGY | index.ts | 447-476 |
| SPLIT_RULES_BY_PATTERN | index.ts | 232-305 |
| LEARNING_CONTEXT_V2_FLAGS | index.ts | 2997-3002 |
| SYSTEM_PROMPT | index.ts | 1632-2545 |

### Funções Principais

| Função | Linhas | Responsabilidade |
|--------|--------|------------------|
| calculateVolumeRanges | 564-670 | Cálculo de volume semanal |
| analyzeDayPattern | 170-222 | Detecção de padrão de dias |
| getSplitRule | 326-359 | Seleção de split |
| determinePeriodization | 698-784 | Tipo de periodização |
| calculateDensityStrategy | 491-531 | Estratégia para sessões curtas |
| calculateVolumeAdjustment | 3078-3157 | Learning Context V2 |
| buildLearningContextV2 | 3159-3258 | Construção do contexto |

---

## Changelog

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-01-30 | Sistema | Versão inicial - baseline de referência |
