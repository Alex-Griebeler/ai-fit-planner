
# Sprint 2: Unificação de Interfaces, Correções de useEffect e Feedback de Erros

## Resumo Executivo

Este sprint foca em melhorar a qualidade técnica do código através de três ações principais:
1. Criar uma interface TypeScript única para exercícios, eliminando duplicações
2. Corrigir o warning de `forwardRef` no `Result.tsx`
3. Adicionar feedback visual quando `startSession` falha no `WorkoutExecution.tsx`

---

## Problema 1: Interfaces TypeScript Duplicadas

### Diagnóstico
Atualmente existem **5 definições diferentes** da interface de exercício espalhadas pelo código:

| Arquivo | Interface | Campos Extras |
|---------|-----------|---------------|
| `Result.tsx` | `WorkoutExercise` | `isCompound`, `muscleGroup` |
| `WorkoutExecution.tsx` | `Exercise` | - |
| `WorkoutPreview.tsx` | `Exercise` | - |
| `ExerciseCard.tsx` | `Exercise` | - |
| `generateWorkoutPdf.ts` | `Exercise` | - |

### Solução
Criar um arquivo `src/types/workout.ts` com interfaces centralizadas e exportadas.

### Código Proposto

```typescript
// src/types/workout.ts (NOVO ARQUIVO)

export interface WorkoutExercise {
  order: number;
  name: string;
  equipment: string;
  sets: number;
  reps: string;
  rest: string;
  intensity?: string;
  tempo?: string;
  notes?: string;
  method?: string;
  isCompound?: boolean;
  muscleGroup?: string;
}

export interface WorkoutCardio {
  type: string;
  duration: string;
  intensity?: string;
  description?: string;
  notes?: string;
}

export interface Workout {
  day: string;
  name: string;
  focus: string;
  muscleGroups: string[];
  estimatedDuration: string;
  exercises: WorkoutExercise[];
  cardio?: WorkoutCardio | null;
}

export interface ProgressionPlan {
  week1?: string;
  week2?: string;
  week3?: string;
  week4?: string;
  deloadWeek?: string;
}

export interface WorkoutPlan {
  planName: string;
  description: string;
  weeklyFrequency: number;
  sessionDuration: string;
  periodization: string;
  workouts: Workout[];
  weeklyVolume: Record<string, number>;
  progressionPlan: string | ProgressionPlan;
  warnings: string[];
  motivationalMessage: string;
}
```

### Arquivos a Atualizar
- `src/pages/Result.tsx` - Remover interfaces locais, importar de `types/workout`
- `src/pages/WorkoutExecution.tsx` - Remover `Exercise`, importar `WorkoutExercise`
- `src/pages/WorkoutPreview.tsx` - Remover `Exercise`, importar `WorkoutExercise`
- `src/components/workout/ExerciseCard.tsx` - Remover `Exercise`, importar `WorkoutExercise`
- `src/lib/generateWorkoutPdf.ts` - Remover `Exercise`, importar `WorkoutExercise`
- `src/lib/workoutScheduler.ts` - Atualizar `WorkoutExercise` para usar o tipo compartilhado

---

## Problema 2: Warning de forwardRef no Result.tsx

### Diagnóstico
O console mostra:
```
Warning: Function components cannot be given refs.
Check the render method of `Result`.
at Popover
```

O problema está na linha ~768 onde um `<button>` é passado como `asChild` para `PopoverTrigger`. Quando o Radix tenta anexar uma ref ao botão, o componente não suporta.

### Solução
Usar o `Button` do shadcn (que já tem `forwardRef`) em vez de `<button>` nativo, ou envolver com `React.forwardRef`.

### Código Proposto

```tsx
// Antes (linha 770 de Result.tsx)
<PopoverTrigger asChild>
  <button className="w-full flex items-center...">

// Depois
<PopoverTrigger asChild>
  <Button variant="ghost" className="w-full flex items-center justify-between py-3 px-3 h-auto rounded-xl hover:bg-muted/50 transition-colors text-left group">
```

---

## Problema 3: Falta de Feedback em startSession

### Diagnóstico
Em `WorkoutExecution.tsx` (linha 98-104), quando `startSession` falha, o erro é apenas logado no console:

```tsx
startSession({...}).catch(console.error);
```

O usuário não recebe nenhum feedback visual.

### Solução
Adicionar toast de erro e estado de loading para o usuário.

### Código Proposto

```tsx
// WorkoutExecution.tsx - linhas 94-105

const [isStartingSession, setIsStartingSession] = useState(false);

useEffect(() => {
  if (workout && activePlan && !currentSession && !isStartingSession) {
    setIsStartingSession(true);
    const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
    startSession({
      workoutPlanId: activePlan.id,
      workoutDay: workout.day,
      workoutName: workout.name,
      totalSets,
    })
    .catch((error) => {
      console.error('Erro ao iniciar sessão:', error);
      toast.error('Erro ao iniciar sessão. Seu progresso pode não ser salvo.');
    })
    .finally(() => setIsStartingSession(false));
  }
}, [workout, activePlan, currentSession, isStartingSession, startSession]);
```

---

## Problema 4: Dependências do useEffect em Result.tsx

### Diagnóstico
O useEffect principal (linhas 339-437) usa `generatePlan` dentro do corpo, mas `generatePlan` não está nas dependências. Isso pode causar comportamento inconsistente.

### Solução
Envolver `generatePlan` em `useCallback` com as dependências corretas.

### Código Proposto

```tsx
const generatePlan = useCallback(async (userData: OnboardingData) => {
  setLoading(true);
  setError(null);
  // ... resto da implementação
}, [isPremium, navigate, plans.length]);
```

E adicionar `generatePlan` ao array de dependências do useEffect principal.

---

## Resumo das Alterações

| Arquivo | Tipo de Alteração |
|---------|-------------------|
| `src/types/workout.ts` | **NOVO** - Interfaces centralizadas |
| `src/pages/Result.tsx` | Remover interfaces, importar, corrigir Popover, useCallback |
| `src/pages/WorkoutExecution.tsx` | Importar tipos, adicionar feedback startSession |
| `src/pages/WorkoutPreview.tsx` | Remover interface, importar |
| `src/components/workout/ExerciseCard.tsx` | Remover interface, importar |
| `src/lib/generateWorkoutPdf.ts` | Remover interfaces, importar |
| `src/lib/workoutScheduler.ts` | Atualizar interface |

---

## Benefícios

- Código mais DRY (Don't Repeat Yourself)
- Manutenção simplificada de tipos
- Eliminação de warnings no console
- Melhor experiência do usuário com feedback de erros
- Menor risco de bugs por inconsistência de tipos

---

## Risco

- **Baixo**: Alterações de tipagem e refatoração sem mudança de lógica
- **Teste sugerido**: Navegar pelo fluxo completo (Result → Preview → Execution) para validar

