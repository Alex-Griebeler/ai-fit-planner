
## Plano: Sistema de Sugestão de Treinos (Opção B)

### Objetivo
Criar um sistema que sugere o próximo treino baseado nos dias selecionados no onboarding e no histórico de sessões da semana, sem obrigar o usuário a seguir.

### Fluxo do Usuário

```text
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD - NOVO CARD                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CENÁRIO 1: Dia programado, treino não feito                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🏋️ Treino de Hoje                                         │  │
│  │                                                           │  │
│  │ Upper A                                    6 exercícios   │  │
│  │ 📅 Segunda-feira                                          │  │
│  │                                                           │  │
│  │              [ Iniciar Treino ]                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  CENÁRIO 2: Treino pendente de dia anterior                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ⏳ Treino Pendente                                        │  │
│  │                                                           │  │
│  │ Upper A (era pra Segunda)                  6 exercícios   │  │
│  │                                                           │  │
│  │     [ Fazer Agora ]         [ Pular → ]                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  CENÁRIO 3: Dia sem treino programado                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 📋 Próximo Treino                                         │  │
│  │                                                           │  │
│  │ Lower B                                    6 exercícios   │  │
│  │ 📅 Quarta-feira                                           │  │
│  │                                                           │  │
│  │ Você está no ritmo! Descanse hoje. 💪                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  CENÁRIO 4: Semana completa                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ✅ Semana Completa!                                       │  │
│  │                                                           │  │
│  │ Você completou todos os 3 treinos desta semana.           │  │
│  │ Nova semana começa no Domingo.                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Arquivos a Criar

**1. `src/lib/workoutScheduler.ts`** - Lógica de agendamento

Funções principais:
- `getDayLabel(dayCode)` - Converte 'mon' para 'Segunda-feira'
- `sortDaysByWeekOrder(days)` - Ordena dias na sequência da semana
- `getTodayDayCode()` - Retorna o código do dia atual ('mon', 'tue', etc.)
- `getWeeklySchedule(workouts, trainingDays, sessions)` - Calcula o cronograma

**2. `src/hooks/useWorkoutSchedule.ts`** - Hook de agendamento

Combina dados de:
- `useWorkoutPlans` (treinos do plano ativo)
- `useOnboardingData` (dias selecionados)
- `useWorkoutSessions` (sessões da semana)

Retorna:
```typescript
{
  nextWorkout: ScheduledWorkout | null,
  todayWorkout: ScheduledWorkout | null,
  missedWorkout: ScheduledWorkout | null,
  isWeekComplete: boolean,
  isRestDay: boolean,
  isLoading: boolean,
}
```

**3. `src/components/dashboard/NextWorkoutCard.tsx`** - Componente visual

Card inteligente que exibe:
- Treino do dia (se hoje for dia de treino)
- Treino pendente (se perdeu ontem)
- Próximo treino (se hoje é dia de descanso)
- Mensagem de semana completa

### Arquivos a Modificar

**4. `src/pages/Dashboard.tsx`**

Adicionar o novo card entre o WeeklyProgress e o ActivePlanCard:
```tsx
<NextWorkoutCard />
```

### Detalhes Técnicos

**Tipos TypeScript:**
```typescript
interface ScheduledWorkout {
  workout: Workout;
  dayCode: string;           // 'mon', 'tue', etc.
  dayLabel: string;          // 'Segunda-feira'
  status: 'today' | 'pending' | 'upcoming' | 'completed';
  originalDayLabel?: string; // Para treinos pendentes
}
```

**Lógica de Detecção:**
1. Ordenar `trainingDays` pela sequência da semana (dom=0, seg=1...)
2. Mapear cada treino do plano para um dia específico
3. Verificar quais treinos da semana já foram completados
4. Identificar se hoje é dia de treino
5. Identificar se há treino pendente de dias anteriores

**Tratamento de Edge Cases:**
- Usuário sem plano ativo: Card não aparece
- Usuário sem dados de onboarding: Fallback para dias do plano
- Mais treinos que dias: Usar nomes genéricos para excedentes
- Semana zerada (domingo): Resetar status

### Comportamento do Botão "Pular"

Quando o usuário clica em "Pular":
- O treino pendente é removido da fila (apenas visualmente)
- NÃO cria registro no banco de dados
- O próximo treino da sequência é exibido
- Estado persiste apenas durante a sessão (localStorage)

### Impacto no Código Existente

| Componente | Mudança | Risco |
|------------|---------|-------|
| `Dashboard.tsx` | Adicionar 1 componente | Nenhum |
| `useOnboardingData.ts` | Apenas consumido | Nenhum |
| `useWorkoutSessions.ts` | Apenas consumido | Nenhum |
| `useWorkoutPlans.ts` | Apenas consumido | Nenhum |
| `ActivePlanCard.tsx` | Nenhuma mudança | Nenhum |

### Ordem de Implementação

1. Criar `src/lib/workoutScheduler.ts` com funções utilitárias
2. Criar `src/hooks/useWorkoutSchedule.ts` com lógica de negócio
3. Criar `src/components/dashboard/NextWorkoutCard.tsx` com UI
4. Integrar no `src/pages/Dashboard.tsx`
5. Testar cenários: dia de treino, dia de descanso, treino pendente, semana completa
