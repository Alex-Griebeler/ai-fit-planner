
## Plano: Sistema de Sugestão de Treinos (Opção B - Revisada)

### Objetivo
Criar um sistema que sugere o próximo treino baseado nos dias selecionados no onboarding e no histórico de sessões da semana, **reordenando a lista de treinos na tela do plano** (Result.tsx).

### Abordagem Escolhida
**Reordenação da lista** - O treino sugerido sobe automaticamente para o topo da lista, com destaque visual sutil (badge + borda).

### Arquivos Criados

**1. `src/lib/workoutScheduler.ts`** - Lógica de agendamento

Funções principais:
- `getDayLabel(dayCode)` - Converte 'mon' para 'Segunda-feira'
- `sortDaysByWeekOrder(days)` - Ordena dias na sequência da semana
- `getTodayDayCode()` - Retorna o código do dia atual
- `getWeeklySchedule(totalWorkouts, trainingDays, sessions)` - Calcula o cronograma
- `reorderWorkoutsWithSuggestion(indices, suggestedIndex)` - Reordena a lista

**2. `src/hooks/useWorkoutSchedule.ts`** - Hook de agendamento

Combina dados de:
- `useWorkoutPlans` (treinos do plano ativo)
- `useOnboardingData` (dias selecionados)
- `useWorkoutSessions` (sessões da semana)

Retorna:
```typescript
{
  suggestedWorkoutIndex: number | null,
  todayWorkoutIndex: number | null,
  pendingWorkoutIndex: number | null,
  completedIndices: number[],
  isWeekComplete: boolean,
  isRestDay: boolean,
  reason: string,
  reorderedIndices: number[],
  trainingDays: string[],
  isLoading: boolean,
}
```

### Arquivos Modificados

**3. `src/pages/Result.tsx`**

- Importou `useWorkoutSchedule` e `Badge`
- Loop de workouts agora usa `reorderedIndices` para ordem inteligente
- Treino sugerido exibe badge "✨ Sugerido" e borda destacada
- Mantém compatibilidade com planos sem dados de onboarding

### Comportamento Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                    TELA PLANO PRONTO                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ✨ Sugerido                                               │  │
│  │ ─────────────────────────────────────────────────────────│  │
│  │ 🏋️ Upper A                                                │  │
│  │ 6 exercícios · 45-60 min                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🏋️ Lower A                                                │  │
│  │ 6 exercícios · 45-60 min                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🏋️ Upper B                                                │  │
│  │ 6 exercícios · 45-60 min                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Lógica de Detecção

1. Ordenar `trainingDays` pela sequência da semana (dom=0, seg=1...)
2. Mapear cada treino do plano para um dia específico
3. Verificar quais treinos da semana já foram completados
4. Identificar se hoje é dia de treino
5. Identificar se há treino pendente de dias anteriores
6. Reordenar lista colocando sugerido no topo

### Tratamento de Edge Cases

- Usuário sem plano ativo: Hook retorna valores default
- Usuário sem dados de onboarding: Fallback para ordem original
- Semana completa: Nenhum treino sugerido
- Dia de descanso: Próximo treino futuro é sugerido

### Impacto no Código Existente

| Componente | Mudança | Risco |
|------------|---------|-------|
| `Result.tsx` | Loop usa reorderedIndices | Baixo |
| `useOnboardingData.ts` | Apenas consumido | Nenhum |
| `useWorkoutSessions.ts` | Apenas consumido | Nenhum |
| `useWorkoutPlans.ts` | Apenas consumido | Nenhum |
| `Dashboard.tsx` | Nenhuma mudança | Nenhum |
| `ActivePlanCard.tsx` | Nenhuma mudança | Nenhum |

### Status: ✅ Implementado

