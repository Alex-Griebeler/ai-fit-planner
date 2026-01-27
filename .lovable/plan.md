

## Plano: Remover Grupos Musculares dos Cards de Treino

### Objetivo
Simplificar os cards de treino no Dashboard removendo a linha de descrição dos grupos musculares, mantendo apenas:
- Nome do treino (ex: "Upper A")
- Quantidade de exercícios (ex: "6 exercícios")

### Mudança Visual

**Antes:**
```
┌─────────────────────────────────────┐
│ Upper A                             │
│ Peitoral • Ombros • Tríceps         │  ← Será removido
│                          6 exercícios│
└─────────────────────────────────────┘
```

**Depois:**
```
┌─────────────────────────────────────┐
│ Upper A                  6 exercícios│
└─────────────────────────────────────┘
```

### Detalhes Técnicos

**Arquivo:** `src/components/dashboard/ActivePlanCard.tsx`

**Alteração:** Remover a linha que exibe os grupos musculares:
```tsx
// Esta linha será removida:
<p className="text-xs text-muted-foreground">
  {workout.muscleGroups?.slice(0, 3).join(' • ') || cleanFocus}
</p>
```

**Impacto:**
- Nenhum impacto em outras partes do app
- Os grupos musculares continuam visíveis na página de detalhes do treino (WorkoutPreview)
- Alinhado com o princípio de "progressive disclosure" já utilizado no app

