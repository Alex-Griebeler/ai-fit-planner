
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

### Status: ✅ Implementado

---

## Plano: Validação de Ordem de Exercícios

### Objetivo
Implementar regras técnicas robustas para ordenação de exercícios no sistema de prescrição, garantindo sequência biomecânica e fisiologicamente correta.

### Arquivos Modificados

**1. `supabase/functions/generate-workout/index.ts`**

#### Alteração 1: Expansão da Seção 4 do SYSTEM_PROMPT (linhas ~1741-1818)
Substituída a seção básica de ordenação por hierarquia completa:
- **NÍVEL 1**: Tipo de exercício (Multi pesado → Multi secundário → Isolador)
- **NÍVEL 2**: Demanda energética (Alta → Baixa)
- **NÍVEL 3**: Grupos musculares por tipo de sessão (Push/Pull/Legs/Upper/Lower/Full Body)
- **NÍVEL 4**: Posicionamento especial (Core ao final, Cintura Escapular após Costas)
- **NÍVEL 5**: Ajustes por objetivo (Hipertrofia, Força, Emagrecimento, Saúde)
- **NÍVEL 6**: Ajustes por nível de usuário (Iniciante/Intermediário/Avançado)
- **5 regras críticas** que a IA NUNCA deve violar

#### Alteração 2: Nova função `validateExerciseOrder()` (linhas ~940-1050)
Validação pós-IA que detecta violações de ordem:
- **Regra 1**: Core não pode estar nas primeiras 2 posições
- **Regra 2**: Compostos devem vir antes de isoladores
- **Regra 3**: Isoladores de braço devem estar na segunda metade
- **Regra 4**: Panturrilha não pode iniciar treino de pernas

#### Alteração 3: Integração no fluxo de validação (linhas ~1325-1352)
Chamada de `validateExerciseOrder()` dentro de `validateWorkoutPlan()`:
- Gera warnings (soft validation)
- Não bloqueia plano
- Logs detalhados para monitoramento

### Resultado
- IA recebe instruções detalhadas sobre ordenação
- Validação pós-IA detecta e reporta violações
- Logs de warning permitem monitorar conformidade

### Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| IA ignora regras | Validação pós-IA detecta e loga |
| Regras muito rígidas | Usa warnings, não bloqueia plano |
| Prompt muito longo | Seção bem estruturada com tabelas |

### Status: ✅ Implementado
