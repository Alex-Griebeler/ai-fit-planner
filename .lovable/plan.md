
# Plano de Melhorias de Médio Risco - AI Trainer App

## REVISÃO COMPLETA E PLANEJAMENTO SEGURO

Este documento detalha as melhorias de médio risco com análise de impacto e plano de implementação que **preserva 100% das funcionalidades existentes**.

---

## 1. PADRONIZAÇÃO DO INÍCIO DE SEMANA (Segunda-feira)

### Situação Atual

| Arquivo | Comportamento | Linha |
|---------|---------------|-------|
| `WeeklyProgress.tsx` | Domingo como início (`today.getDay()`) | 21-22 |
| `workoutScheduler.ts` | Domingo como início (`DAY_ORDER[0] = 'sun'`) | 21, 103-110 |
| `useStreak.ts` | Usa `date-fns` (independente) | 59-60 |

### Impacto da Inconsistência
- **Leve:** O componente `WeeklyProgress` mostra "D S T Q Q S S" (Domingo primeiro) que é o padrão brasileiro
- **Funcional:** A lógica de streak funciona corretamente com `date-fns`
- **Não há bug:** Apenas inconsistência visual vs expectativa

### Plano de Correção (BAIXO RISCO)

**Opção A - Manter Domingo (Recomendado):**
- O padrão brasileiro de calendário usa Domingo como primeiro dia
- Apenas documentar a convenção no código
- **Risco: ZERO** - nenhuma alteração

**Opção B - Migrar para Segunda:**
```typescript
// WeeklyProgress.tsx - ANTES
startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday = 0

// WeeklyProgress.tsx - DEPOIS  
const dayOfWeek = today.getDay();
const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
startOfWeek.setDate(today.getDate() - offset);

// Também atualizar dayLabels para começar em Segunda
const dayLabels = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']; // Seg-Dom
```

**Funcionalidades Afetadas:**
- ✅ Contagem de sessões da semana (continua funcionando)
- ✅ Badges de dias treinados (apenas ordem visual muda)
- ✅ Streak calculation (usa date-fns, não afetado)

**Risco de Reescrita:** BAIXO - Mudança isolada em 1 arquivo

---

## 2. TIPAR RESPOSTAS DA EDGE FUNCTION (Remover `any`)

### Situação Atual
A Edge Function `generate-workout/index.ts` (3911 linhas) usa `any` em:
- Linha 233: `(functionError as any).context`
- Linha 372: `function reorderWorkoutsByDayStructure(workouts: any[])`
- Linhas 1141-1158: Schemas Zod com `z.any()`
- Linha 1397: `const plan = rawPlan as any`

### Impacto dos `any`
- **Segurança:** Erros de runtime não detectados em compile-time
- **Manutenção:** Difícil refatorar sem tipos
- **Funcional:** Não causa bugs visíveis ao usuário

### Plano de Correção (MÉDIO RISCO)

**Fase 1 - Criar interfaces (SEM alterar lógica):**
```typescript
// Adicionar no topo da Edge Function

interface WorkoutExercise {
  order: number;
  name: string;
  equipment: string;
  sets: number;
  reps: string;
  rest: string;
  intensity?: string;
  tempo?: string;
  notes?: string;
  isCompound?: boolean;
  method?: string;
  muscleGroup?: string;
}

interface GeneratedWorkout {
  day: string;
  name: string;
  focus: string;
  muscleGroups: string[];
  estimatedDuration: string;
  exercises: WorkoutExercise[];
  cardio?: WorkoutCardio | null;
}

interface GeneratedPlan {
  planName: string;
  description: string;
  weeklyFrequency: number;
  sessionDuration: string;
  periodization: string;
  workouts: GeneratedWorkout[];
  weeklyVolume: Record<string, number>;
  progressionPlan: string | ProgressionPlan;
  warnings: string[];
  motivationalMessage: string;
}
```

**Fase 2 - Substituir `any` gradualmente:**
```typescript
// ANTES
function reorderWorkoutsByDayStructure(workouts: any[]): any[]

// DEPOIS
function reorderWorkoutsByDayStructure(workouts: GeneratedWorkout[]): GeneratedWorkout[]
```

**Funcionalidades Afetadas:**
- ✅ Geração de plano (lógica idêntica, só tipos adicionados)
- ✅ Validação Zod (mantida)
- ✅ Resposta ao frontend (estrutura preservada)

**Risco de Reescrita:** MÉDIO - Muitos arquivos, mas sem mudança de lógica

---

## 3. ESTRUTURAR RESPOSTA DE RATE LIMIT (Status 429)

### Situação Atual
- Edge Function retorna erro como string na mensagem
- Frontend usa regex para extrair `reset_at` (linhas 253-269 de Result.tsx)
- Funciona mas é frágil

### Código Atual (Result.tsx)
```typescript
// Tenta extrair reset_at de mensagens de erro via JSON parsing e regex
const jsonMatch = errorMessage.match(/\{.*\}/);
if (jsonMatch) {
  try {
    const errorBody = JSON.parse(jsonMatch[0]);
```

### Plano de Correção (BAIXO RISCO)

**Edge Function - Retornar resposta estruturada:**
```typescript
// ANTES (misturado na mensagem)
return new Response(JSON.stringify({
  error: `Limite de ${maxRequests} gerações por hora atingido.`,
  reset_at: rateLimitResult.reset_at,
  // ...
}), { status: 200 });  // ← Status 200 com erro no body!

// DEPOIS (status HTTP correto)
return new Response(JSON.stringify({
  error: 'rate_limit_exceeded',
  message: `Limite de ${maxRequests} gerações por hora atingido.`,
  reset_at: rateLimitResult.reset_at,
  max_requests: maxRequests,
  current_count: rateLimitResult.current_count,
}), { 
  status: 429,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

**Frontend - Simplificar parsing:**
```typescript
// ANTES (regex frágil)
const jsonMatch = errorMessage.match(/\{.*\}/);

// DEPOIS (estruturado)
if (functionError?.context?.status === 429) {
  const errorBody = JSON.parse(functionError.context.body);
  setRateLimitResetAt(new Date(errorBody.reset_at));
  setIsRateLimited(true);
}
```

**Funcionalidades Afetadas:**
- ✅ Rate limiting (continua funcionando)
- ✅ Timer de espera (informação mais confiável)
- ✅ Mensagem ao usuário (preservada)

**Risco de Reescrita:** BAIXO - Melhoria sem mudança de comportamento

---

## 4. WORKAROUND DE DELEÇÃO MANUAL DE PLANOS

### Situação Atual (useWorkoutPlans.ts linhas 83-96)
```typescript
// Para usuários free: deletar planos anteriores antes de criar novo
if (existingPlans && existingPlans.length > 0) {
  await supabase.from("workout_plans").delete().eq("user_id", user.id);
}
```

### Por que existe este workaround?
- O trigger `enforce_workout_plan_limit` BLOQUEIA inserção se já existe 1+ plano
- O código deleta TODOS os planos antes de inserir novo
- Isso FUNCIONA mas perde histórico de planos anteriores

### Análise de Impacto
| Comportamento | Com Workaround | Sem Workaround |
|---------------|----------------|----------------|
| Criar novo plano (free) | ✅ Funciona | ❌ Erro do trigger |
| Histórico de planos | ❌ Perdido | ✅ Preservado |
| Planos inativos | ❌ Deletados | ✅ Mantidos |

### Plano de Correção (MÉDIO RISCO)

**Opção A - Modificar Trigger (Recomendado):**
```sql
-- Novo comportamento: desativar planos anteriores em vez de bloquear
CREATE OR REPLACE FUNCTION public.enforce_workout_plan_limit()
RETURNS trigger AS $$
BEGIN
  -- Check if premium
  IF EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = NEW.user_id 
    AND plan_type = 'premium' 
    AND status = 'active'
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Free users: desativar planos anteriores (não bloquear)
  UPDATE workout_plans 
  SET is_active = false 
  WHERE user_id = NEW.user_id AND is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Remover workaround do hook:**
```typescript
// ANTES (useWorkoutPlans.ts)
if (existingPlans && existingPlans.length > 0) {
  await supabase.from("workout_plans").delete().eq("user_id", user.id);
}

// DEPOIS
// Não precisa deletar - trigger desativa automaticamente
```

**Funcionalidades Afetadas:**
- ✅ Criar plano (continua funcionando)
- ✅ Limite de 1 plano ativo (respeitado)
- ✅ Histórico de planos (agora preservado!)
- ⚠️ Requer migração de banco

**Risco de Reescrita:** MÉDIO - Requer teste extensivo do fluxo de criação

---

## 5. DELAY HARDCODED DE CACHE (Result.tsx linha 353)

### Situação Atual
```typescript
// Pequeno delay para garantir propagação do cache invalidation
await new Promise(resolve => setTimeout(resolve, 150));
```

### Por que existe?
- `queryClient.invalidateQueries()` é assíncrono
- Sem o delay, navegação pode mostrar dados stale
- É um remendo para timing de React Query

### Plano de Correção (MUITO BAIXO RISCO)

**Usar await corretamente:**
```typescript
// ANTES
await createPlan({...});
await new Promise(resolve => setTimeout(resolve, 150));

// DEPOIS
await createPlan({...});
await queryClient.invalidateQueries({ queryKey: ["workout-plans", user?.id] });
```

**Funcionalidades Afetadas:**
- ✅ Salvamento de plano (idêntico)
- ✅ Navegação pós-save (mais confiável)

**Risco de Reescrita:** MUITO BAIXO

---

## 6. REF PARA CONTROLE DE EXECUÇÃO ÚNICA (Result.tsx linha 157)

### Situação Atual
```typescript
const hasStartedGeneration = useRef(false);
// ... usado para evitar re-renders gerando planos duplicados
```

### Análise
- Este padrão é **VÁLIDO** em React para efeitos one-time
- Alternativa seria React Query `useMutation`, mas requer refatoração maior
- **NÃO É UM BUG** - é um padrão defensivo

### Recomendação: MANTER
- O código funciona corretamente
- Refatorar para mutations aumentaria complexidade
- Prioridade: BAIXA/FUTURA

---

## 7. WORKAROUND DE 30 SEGUNDOS PARA DUPLICATAS

### Situação Atual (useWorkoutSessions.ts linhas 90-101)
```typescript
// Check if a session was completed recently (last 30 seconds)
const recentlyCompleted = await supabase
  .from('workout_sessions')
  .select('completed_at')
  .gte('completed_at', new Date(Date.now() - 30000).toISOString())
```

### Por que existe?
- Double-clicks ou re-renders podem chamar `startSession` múltiplas vezes
- Sem esta verificação, criaria sessões duplicadas
- É um **mecanismo de proteção** que funciona

### Análise de Risco
| Solução | Complexidade | Risco |
|---------|--------------|-------|
| Manter workaround | Nenhuma | ZERO |
| Database locks | Alta | ALTO |
| Unique constraint | Média | MÉDIO |

### Recomendação: MANTER
- O workaround é efetivo e seguro
- Solução "limpa" (locks/transactions) tem complexidade alta
- Prioridade: BAIXA/FUTURA

---

## 8. MAPEAMENTO DE DIAS INCOMPLETO

### Situação Atual (workoutScheduler.ts linhas 34-60)
```typescript
const DAY_NAME_TO_CODE: Record<string, DayCode> = {
  'domingo': 'sun',
  'segunda': 'mon',
  // ... faltam variações
};
```

### Variações que faltam
- Abreviações: 'seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'
- Formato numérico: 'Dia 1', 'Dia 2', etc.

### Plano de Correção (MUITO BAIXO RISCO)
```typescript
const DAY_NAME_TO_CODE: Record<string, DayCode> = {
  // Existentes...
  
  // Adicionar abreviações
  'seg': 'mon',
  'ter': 'tue',
  'qua': 'wed',
  'qui': 'thu',
  'sex': 'fri',
  'sab': 'sat',
  'dom': 'sun',
};
```

**Funcionalidades Afetadas:**
- ✅ Agendamento de treinos (mais robusto)
- ✅ Nenhuma lógica alterada

**Risco de Reescrita:** MUITO BAIXO

---

## MATRIZ DE PRIORIZAÇÃO FINAL

| Item | Risco | Impacto | Complexidade | Prioridade |
|------|-------|---------|--------------|------------|
| Mapeamento de dias | MUITO BAIXO | Baixo | Trivial | 1️⃣ |
| Delay de cache | MUITO BAIXO | Baixo | Trivial | 2️⃣ |
| Rate limit 429 | BAIXO | Médio | Baixa | 3️⃣ |
| Início de semana | BAIXO | Baixo | Baixa | 4️⃣ |
| Trigger de planos | MÉDIO | Médio | Média | 5️⃣ |
| Tipar Edge Function | MÉDIO | Alto | Alta | 6️⃣ |
| Ref hasStarted | N/A | N/A | N/A | MANTER |
| Workaround 30s | N/A | N/A | N/A | MANTER |

---

## ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

### Sprint 1 (Baixíssimo Risco) ✅
1. Adicionar aliases de dias em `workoutScheduler.ts`
2. Remover delay hardcoded em `Result.tsx`

### Sprint 2 (Baixo Risco)
3. Estruturar resposta 429 na Edge Function
4. Atualizar parsing no frontend
5. Documentar convenção de início de semana

### Sprint 3 (Médio Risco) 
6. Migração do trigger `enforce_workout_plan_limit`
7. Remover workaround de deleção no hook

### Sprint 4 (Longo Prazo)
8. Tipar Edge Function progressivamente

---

## GARANTIAS DE PRESERVAÇÃO

Para CADA mudança, validar:

- [ ] Geração de plano funciona
- [ ] Salvamento de plano funciona
- [ ] Carregamento de plano existente funciona
- [ ] Rate limit exibe timer corretamente
- [ ] Histórico de sessões preservado
- [ ] Streak calculation correto
- [ ] Weekly progress exibe corretamente
- [ ] Conquistas desbloqueiam

**NENHUMA funcionalidade será alterada sem teste prévio.**
