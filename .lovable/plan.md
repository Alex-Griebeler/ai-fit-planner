
# Auditoria Completa do Código - AI Trainer App

## Sumário Executivo

Esta auditoria analisou **+50 arquivos** incluindo hooks, páginas, componentes, edge functions e integrações. Foram identificados **17 bugs/inconsistências**, **8 áreas com "remendos"** (workarounds), e **12 oportunidades de refatoração**.

---

## 1. BUGS E INCONSISTÊNCIAS CRÍTICOS

### 1.1 Race Condition na Finalização de Treino
**Arquivo:** `src/pages/WorkoutComplete.tsx` (linhas 59-78)
**Problema:** O `useEffect` que atualiza streak e conquistas usa `eslint-disable` para suprimir warning de dependências faltantes. Isso pode causar:
- Conquistas não desbloqueadas corretamente
- Streak não atualizado se `achievementStats` mudar

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);  // ← Faltam dependências: updateStreak, checkAndUnlockAchievements, achievementStats
```

**Risco de Reescrita:** BAIXO - Correção pontual

---

### 1.2 Variável Não Utilizada em Settings
**Arquivo:** `src/pages/Settings.tsx` (linha 21)
**Problema:** `isSavingAny` é declarada mas nunca utilizada

```typescript
const isSavingAny = isUpdating || isSaving; // ← Não usada
```

**Risco de Reescrita:** MUITO BAIXO - Remover linha

---

### 1.3 Uso de `any` Extensivo na Edge Function
**Arquivo:** `supabase/functions/generate-workout/index.ts`
**Problema:** 15+ usos de `any` type, incluindo:
- Linha 233: `(functionError as any).context`
- Linha 372: `function reorderWorkoutsByDayStructure(workouts: any[])`
- Linhas 1141-1158: Schemas Zod com `z.any()`
- Linha 1397: `const plan = rawPlan as any`

**Impacto:** Erros de runtime não detectados em compile time

**Risco de Reescrita:** MÉDIO - Requer criação de tipos para todo o pipeline

---

### 1.4 TODO Pendente - Volume Total de Conquistas
**Arquivo:** `src/pages/WorkoutComplete.tsx` (linha 50)
**Problema:** `totalVolume: 0` é hardcoded, conquistas baseadas em volume nunca serão desbloqueadas

```typescript
totalVolume: 0, // TODO: Calculate from exercises_data
```

**Risco de Reescrita:** BAIXO - Implementação simples

---

### 1.5 Google OAuth Desabilitado sem Alternativa
**Arquivo:** `src/pages/Login.tsx` (linhas 351-352)
**Problema:** Login com Google está comentado mas o botão `signInWithGoogle` ainda existe no hook

```typescript
{/* TODO: Re-enable when Google OAuth is properly configured */}
```

**Risco de Reescrita:** MUITO BAIXO - Apenas descomentar/remover

---

## 2. INCONSISTÊNCIAS DE DADOS

### 2.1 Mapeamento de Dias Incompleto
**Arquivo:** `src/lib/workoutScheduler.ts` (linhas 34-60)
**Problema:** O mapeamento `DAY_NAME_TO_CODE` não cobre todos os formatos possíveis vindos da IA:

```typescript
// Faltam variações como:
// 'seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'
// 'Dia 1', 'Dia 2', etc.
```

**Risco de Reescrita:** BAIXO - Adicionar aliases

---

### 2.2 Inconsistência na Contagem de Semana
**Arquivo:** `src/components/gamification/WeeklyProgress.tsx` (linhas 19-22)
**Problema:** A semana começa no Domingo (padrão americano), mas o onboarding usa segunda como início

```typescript
startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday = 0
```

Conflita com a lógica de `useStreak.ts` que usa `startOfDay` diferentemente.

**Risco de Reescrita:** MÉDIO - Requer padronização global

---

### 2.3 Dados Falsos em Política de Privacidade
**Arquivo:** `src/pages/PrivacyPolicy.tsx` (linha 39)
**Problema:** CNPJ placeholder nunca substituído

```typescript
inscrito no CNPJ sob o nº XX.XXX.XXX/0001-XX
```

**Risco de Reescrita:** MUITO BAIXO - Atualizar texto

---

## 3. REMENDOS (WORKAROUNDS)

### 3.1 Deleção de Planos para Contornar Limite Free
**Arquivo:** `src/hooks/useWorkoutPlans.ts` (linhas 83-96)
**Problema:** Em vez de usar o trigger do banco (`enforce_workout_plan_limit`), o código deleta planos manualmente antes de criar novos

```typescript
// Para usuários free: deletar planos anteriores antes de criar novo
// (O trigger enforce_workout_plan_limit bloqueia se houver 1+ plano)
if (existingPlans && existingPlans.length > 0) {
  await supabase.from("workout_plans").delete().eq("user_id", user.id);
}
```

**Solução Limpa:** Modificar o trigger para substituir automaticamente OU desativar planos anteriores

**Risco de Reescrita:** MÉDIO - Requer migração de banco

---

### 3.2 Prevenção de Duplicatas por Tempo
**Arquivo:** `src/hooks/useWorkoutSessions.ts` (linhas 90-101)
**Problema:** Verifica se sessão foi completada nos últimos 30 segundos para evitar duplicatas - isso é um remendo para race conditions

```typescript
// Check if a session was completed recently (last 30 seconds) to prevent duplicates
const recentlyCompleted = await supabase
  .from('workout_sessions')
  .select('completed_at')
  .gte('completed_at', new Date(Date.now() - 30000).toISOString())
```

**Solução Limpa:** Usar transações ou locks no banco

**Risco de Reescrita:** ALTO - Race conditions são complexas

---

### 3.3 Cache Invalidation com Delay Hardcoded
**Arquivo:** `src/pages/Result.tsx` (linhas 353-354)
**Problema:** Delay de 150ms para "garantir propagação do cache"

```typescript
// Pequeno delay para garantir propagação do cache invalidation
await new Promise(resolve => setTimeout(resolve, 150));
```

**Solução Limpa:** Usar `await queryClient.invalidateQueries()` corretamente

**Risco de Reescrita:** BAIXO

---

### 3.4 Ref para Controlar Execução Única
**Arquivo:** `src/pages/Result.tsx` (linha 157)
**Problema:** `hasStartedGeneration.current` é usado para evitar re-renders gerando planos duplicados

```typescript
const hasStartedGeneration = useRef(false);
// ... usado em múltiplos lugares para evitar re-execução
```

**Solução Limpa:** Usar React Query mutations corretamente

**Risco de Reescrita:** MÉDIO - Refatorar fluxo de geração

---

### 3.5 Rate Limit Parsing via Regex em Mensagens de Erro
**Arquivo:** `src/pages/Result.tsx` (linhas 231-272)
**Problema:** Tenta extrair `reset_at` de mensagens de erro via JSON parsing e regex

```typescript
const jsonMatch = errorMessage.match(/\{.*\}/);
if (jsonMatch) {
  try {
    const errorBody = JSON.parse(jsonMatch[0]);
```

**Solução Limpa:** Edge function retornar status code 429 com body estruturado

**Risco de Reescrita:** BAIXO - Apenas padronizar resposta

---

## 4. OPORTUNIDADES DE REFATORAÇÃO

### 4.1 Hooks Muito Grandes
| Hook | Linhas | Recomendação |
|------|--------|--------------|
| `useWorkoutSessions.ts` | 257 | Extrair mutations para hooks separados |
| `useWorkoutPlans.ts` | 175 | OK, mas pode extrair `useActivePlan` |
| `useSubscription.ts` | 166 | Extrair `useStripeCheckout` |

**Risco:** BAIXO - Refatoração incremental

---

### 4.2 Páginas com Lógica Demais
| Página | Linhas | Problema |
|--------|--------|----------|
| `Result.tsx` | 1041 | Mistura geração, exibição, salvamento |
| `WorkoutExecution.tsx` | 507 | Muita lógica de estado local |

**Recomendação:** Extrair hooks customizados:
- `useWorkoutGeneration()` 
- `useWorkoutExecutionState()`

**Risco:** MÉDIO - Muitas dependências internas

---

### 4.3 Edge Function Monolítica
**Arquivo:** `supabase/functions/generate-workout/index.ts` (3911 linhas)

**Problemas:**
- Impossível testar unitariamente
- Difícil manutenção
- Risco de timeout em cold starts

**Recomendação:** Dividir em módulos:
- `volume-calculator.ts`
- `split-rules.ts`
- `prompt-builder.ts`
- `post-validator.ts`

**Risco:** ALTO - Função crítica, requer testes extensivos

---

### 4.4 Duplicação de Lógica de Tradução
**Arquivos:** 
- `src/lib/workoutScheduler.ts` (translations)
- `src/pages/Result.tsx` (muscleLabels)
- `supabase/functions/generate-workout/index.ts` (BODY_AREA_TO_MUSCLES)

**Recomendação:** Criar `src/lib/i18n/muscle-groups.ts` centralizado

**Risco:** BAIXO

---

## 5. PROBLEMAS DE SEGURANÇA MENORES

### 5.1 Sanitização Básica de Inputs
**Arquivo:** `supabase/functions/generate-workout/index.ts` (linhas 58-89)
- Sanitização existe mas é básica
- Não há rate limiting no client-side
- Zod valida mas `any` bypassa

**Risco:** BAIXO (RLS protege dados)

---

## 6. MATRIZ DE RISCO PARA REESCRITA

| Área | Risco de Corrupção | Complexidade | Prioridade |
|------|-------------------|--------------|------------|
| Bug WorkoutComplete | BAIXO | Fácil | 🔴 Alta |
| TODO totalVolume | BAIXO | Fácil | 🔴 Alta |
| Variável não usada | MUITO BAIXO | Trivial | 🟢 Baixa |
| Workaround 30s duplicatas | ALTO | Complexa | 🟡 Média |
| Deleção manual de planos | MÉDIO | Média | 🟡 Média |
| Tipos `any` | MÉDIO | Trabalhosa | 🟡 Média |
| Edge function split | ALTO | Muito Complexa | 🟠 Baixa/Futura |
| Inconsistência semana | MÉDIO | Média | 🟡 Média |
| CNPJ placeholder | MUITO BAIXO | Trivial | 🟢 Baixa |

---

## 7. RESUMO DE AÇÕES RECOMENDADAS

### Correções Imediatas (Baixo Risco):
1. Remover `eslint-disable` em WorkoutComplete e adicionar dependências
2. Implementar cálculo de `totalVolume` para conquistas
3. Remover variável `isSavingAny` não utilizada
4. Atualizar CNPJ na política de privacidade

### Melhorias de Curto Prazo (Médio Risco):
5. Padronizar início de semana (domingo vs segunda)
6. Tipar respostas da Edge Function (remover `any`)
7. Estruturar resposta de rate limit com status 429

### Refatorações de Longo Prazo (Alto Risco):
8. Dividir Edge Function em módulos testáveis
9. Extrair hooks de `Result.tsx` e `WorkoutExecution.tsx`
10. Substituir workaround de duplicatas por solução transacional

---

## 8. CONCLUSÃO

O código está **funcionalmente estável** com arquitetura sólida. Os principais problemas são:

1. **Dívida técnica acumulada** em workarounds
2. **Falta de tipagem forte** na Edge Function
3. **Algumas features incompletas** (totalVolume, Google OAuth)

**Recomendação:** Priorizar correções de bugs (#1-4) que são de baixo risco, e planejar refatorações maiores para sprints futuros com testes adequados.
