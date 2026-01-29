

# Plano: Corrigir Sistema de Sugestão de Treinos

## Diagnóstico

O sistema de sugestão de treinos **não está funcionando** devido a uma incompatibilidade de formatos:

| Fonte de Dados | Formato | Exemplo |
|----------------|---------|---------|
| `user_onboarding_data.training_days` | Código inglês | `['mon', 'wed', 'fri']` |
| `workout_plans.workouts[].day` | Português | `"Segunda"`, `"Terça-feira"` |
| `workout_sessions.workout_day` | Português | `"Segunda"` (copiado do plano) |
| `workoutScheduler.ts` (esperado) | Código inglês | `'mon'`, `'tue'` |

### Resultado

- O scheduler compara `"segunda" === "mon"` → **sempre falso**
- Treinos completados nunca são reconhecidos
- A sugestão sempre mostra o primeiro treino (índice 0)

---

## Solução

Adicionar uma função de normalização no `workoutScheduler.ts` que converte nomes de dias em português para códigos de dia.

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/lib/workoutScheduler.ts` | Adicionar `normalizeDayCode()` e atualizar lógica |

---

## Implementação Técnica

### 1. Criar Função de Normalização

```typescript
// Nova função para converter PT → código
const DAY_NAME_TO_CODE: Record<string, DayCode> = {
  // Formato curto
  'domingo': 'sun',
  'segunda': 'mon',
  'terça': 'tue',
  'terca': 'tue',
  'quarta': 'wed',
  'quinta': 'thu',
  'sexta': 'fri',
  'sábado': 'sat',
  'sabado': 'sat',
  // Formato completo
  'segunda-feira': 'mon',
  'terça-feira': 'tue',
  'terca-feira': 'tue',
  'quarta-feira': 'wed',
  'quinta-feira': 'thu',
  'sexta-feira': 'fri',
  // Já é código
  'sun': 'sun',
  'mon': 'mon',
  'tue': 'tue',
  'wed': 'wed',
  'thu': 'thu',
  'fri': 'fri',
  'sat': 'sat',
};

export function normalizeDayCode(day: string): DayCode | null {
  const normalized = day.toLowerCase().trim();
  return DAY_NAME_TO_CODE[normalized] || null;
}
```

### 2. Atualizar `getWeeklySchedule()`

Modificar a linha 140 para usar a normalização:

```typescript
// ANTES (linha 140):
const dayCode = session.workout_day.toLowerCase() as DayCode;

// DEPOIS:
const dayCode = normalizeDayCode(session.workout_day);
if (!dayCode) return; // Pular sessões com dia inválido
```

### 3. Atualizar Mapeamento Treino → Dia

O mapeamento atual assume que o índice do treino corresponde ao índice do dia no onboarding. Precisamos também mapear o dia do **treino do plano** para o código correto:

```typescript
// Mapear treinos para dias baseado no dia no PLANO
workouts.forEach((workout, idx) => {
  const workoutDayCode = normalizeDayCode(workout.day);
  if (workoutDayCode && sortedDays.includes(workoutDayCode)) {
    workoutToDayMap.set(idx, workoutDayCode);
  }
});
```

---

## Fluxo Corrigido

```text
┌──────────────────────────────────────────────────────────────────┐
│                    FLUXO CORRIGIDO                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Sessão Salva          Normalização           Matching           │
│  ────────────          ────────────           ────────           │
│  workout_day:     →    normalizeDayCode()  →   === sortedDays   │
│  "Segunda"             → "mon"                  ['mon'] ✓       │
│                                                                  │
│  Resultado: Treino reconhecido como completado!                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Testes Necessários

1. **Sessão existente com `workout_day: "Segunda"`**
   - Deve ser reconhecida como completada se `training_days` inclui `'mon'`
   
2. **Novo treino iniciado em dia de treino**
   - Deve aparecer como sugerido com badge "✨ Sugerido"
   
3. **Treino perdido (dia anterior)**
   - Deve aparecer como sugerido com reason "Treino de Segunda-feira ainda não realizado"

4. **Semana completa**
   - Nenhum treino deve ter badge de sugestão

---

## Impacto e Riscos

### Baixo Risco
- Mudança é puramente de normalização/tradução
- Não altera estrutura de dados
- Compatível com sessões existentes

### Benefícios Imediatos
- Sistema de sugestão passa a funcionar corretamente
- Badge "✨ Sugerido" aparece no treino certo
- Histórico de treinos é considerado na sugestão

