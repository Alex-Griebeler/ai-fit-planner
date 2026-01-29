

# Plano: Dashboard Otimizado para Mobile

## Resumo das Mudanças

Implementar 6 mudanças de baixo risco para reduzir scroll vertical em ~400px e melhorar a hierarquia visual.

---

## Fase 1: Compactar Cards Secundários

### 1.1 SessionHistoryCard - Limitar a 3 sessões

**Arquivo:** `src/components/dashboard/SessionHistoryCard.tsx`

```typescript
// Linha 54 - ANTES:
const recentSessions = sessions.slice(0, 5);

// DEPOIS:
const recentSessions = sessions.slice(0, 3);
```

**Risco:** Muito baixo - apenas 1 número muda

---

### 1.2 WorkoutHistoryCard - Remover ScrollArea fixa

**Arquivo:** `src/components/dashboard/WorkoutHistoryCard.tsx`

- Remover `<ScrollArea className="h-[300px]">` (linha 73)
- Limitar a 2 planos inativos
- Adicionar link "Ver todos" se houver mais

```typescript
// Substituir ScrollArea por div simples
const displayPlans = inactivePlans.slice(0, 2);

<div className="space-y-2">
  {displayPlans.map((plan) => (...))}
  {inactivePlans.length > 2 && (
    <p className="text-xs text-center text-muted-foreground pt-2">
      +{inactivePlans.length - 2} planos anteriores
    </p>
  )}
</div>
```

**Risco:** Baixo - remove wrapper, mantém lógica

---

### 1.3 ProgressPreviewCard - Reduzir padding

**Arquivo:** `src/components/dashboard/ProgressPreviewCard.tsx`

```typescript
// Linha 11 - ANTES:
<CardContent className="p-5">

// DEPOIS:
<CardContent className="p-3">
```

**Risco:** Muito baixo - apenas CSS

---

## Fase 2: Reorganizar Hierarquia

### 2.1 WeeklyProgress - Adicionar prop showTitle

**Arquivo:** `src/components/gamification/WeeklyProgress.tsx`

```typescript
interface WeeklyProgressProps {
  compact?: boolean;
  showTitle?: boolean;  // NOVO
}

export function WeeklyProgress({ compact = false, showTitle = true }: WeeklyProgressProps) {
  // ...
  
  // Linha 88-91 - Condicionar título:
  {showTitle && (
    <span className="font-medium text-foreground">
      Progresso Semanal
    </span>
  )}
}
```

**Risco:** Baixo - prop opcional com default true (não quebra uso existente)

---

### 2.2 Dashboard - Reordenar componentes

**Arquivo:** `src/pages/Dashboard.tsx`

Nova ordem (mover WeeklyProgress para cima, entre Mensagem e ActivePlan):

```text
1. ProfileCard
2. MotivationalMessage
3. WeeklyProgress (SEM título) ← MOVIDO
4. ActivePlanCard (HERO)
5. StreakCard
6. StatsGrid (2x2)
7. SessionHistoryCard
8. ProgressPreviewCard
9. WorkoutHistoryCard
```

**Risco:** Baixo - apenas reordenação de JSX

---

## Fase 3: Melhorar ActivePlanCard Header

### 3.1 Adicionar objetivo do usuário ao header

**Arquivo:** `src/pages/Dashboard.tsx`

```typescript
import { useOnboardingData } from '@/hooks/useOnboardingData';

// No componente:
const { onboardingData } = useOnboardingData();

const goalLabels: Record<string, string> = {
  weight_loss: 'Emagrecimento',
  hypertrophy: 'Hipertrofia',
  health: 'Saúde',
  performance: 'Performance',
};

const userGoal = goalLabels[onboardingData?.goal || ''] || null;

// Passar para ActivePlanCard:
<ActivePlanCard plan={activePlan ?? null} isLoading={plansLoading} goal={userGoal} />
```

**Arquivo:** `src/components/dashboard/ActivePlanCard.tsx`

```typescript
interface ActivePlanCardProps {
  plan: WorkoutPlan | null;
  isLoading: boolean;
  goal?: string | null;  // NOVO - opcional
}

// No header (linha 101-103):
<Badge variant="default" className="mb-2 bg-primary/20 text-primary border-0">
  {goal || 'Plano Ativo'}
</Badge>
```

**Risco:** Médio - nova prop, mas opcional com fallback

---

## Arquivos Modificados

| Arquivo | Mudança | Linhas Afetadas |
|---------|---------|-----------------|
| `SessionHistoryCard.tsx` | slice 5→3 | 1 linha |
| `WorkoutHistoryCard.tsx` | Remover ScrollArea, limitar items | ~15 linhas |
| `ProgressPreviewCard.tsx` | Reduzir padding | 1 linha |
| `WeeklyProgress.tsx` | Adicionar prop showTitle | ~8 linhas |
| `Dashboard.tsx` | Reordenar + passar goal | ~20 linhas |
| `ActivePlanCard.tsx` | Nova prop goal | ~5 linhas |

**Total:** ~50 linhas de mudança

---

## Resultado Esperado

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| SessionHistoryCard | ~350px | ~180px | -170px |
| WorkoutHistoryCard | ~350px | ~120px | -230px |
| ProgressPreviewCard | ~80px | ~60px | -20px |
| **Scroll total** | ~780px | ~360px | **-420px** |

---

## Checklist de Testes

- [ ] Dashboard carrega sem erros
- [ ] SessionHistoryCard mostra máximo 3 sessões
- [ ] WorkoutHistoryCard mostra máximo 2 planos
- [ ] WeeklyProgress aparece entre Mensagem e ActivePlan
- [ ] WeeklyProgress NÃO mostra título "Progresso Semanal"
- [ ] ActivePlanCard mostra objetivo (Emagrecimento/Hipertrofia/etc)
- [ ] Navegação para /progress e /result continua funcionando
- [ ] Deletar sessão/plano continua funcionando

