
# Plano: Implementar Lógica de Mínima Variação de Exercícios

## Contexto Estratégico

Este aplicativo será utilizado em modelo **White Label para academias low cost**, onde a operação depende de baixo nível de complexidade na sala de treino. O professor deve focar na **orientação da execução**, não em gerenciar múltiplas rotinas diferentes.

---

## Lógica Condicional do Split (MANTER)

O step de Split **só aparece** quando:
- **Nível**: Intermediário OU Avançado (não iniciantes)
- **Frequência**: Exatamente 3x/semana

Esta lógica já está implementada em `Onboarding.tsx`:
```typescript
const shouldShowSplitStep = useMemo(() => 
  data.experienceLevel !== 'beginner' && data.trainingDays.length === 3,
  [data.experienceLevel, data.trainingDays.length]
);
```

**Iniciantes** vão sempre para Full Body automaticamente, sem ver opções de split.

---

## Resumo das Mudanças

| Arquivo | Ação | Risco |
|---------|------|-------|
| `StepVariation.tsx` | **Deletar** | Baixo |
| `steps/index.ts` | Remover 1 linha | Baixo |
| `StepSplitPreference.tsx` | Reduzir opções (4→2) | Baixo |
| `Onboarding.tsx` | Ajustar steps (13→12) | Baixo |
| `onboarding.ts` | Remover `variationPreference` | Médio |
| `TrainingSection.tsx` | Remover seção variação | Baixo |
| `generate-workout/index.ts` | Modificar prompt + lógica | Alto |

---

## Mudanças Detalhadas

### 1. DELETAR: `src/components/onboarding/steps/StepVariation.tsx`

Remover arquivo completamente.

### 2. EDITAR: `src/components/onboarding/steps/index.ts`

Remover export do `StepVariation`.

### 3. EDITAR: `src/components/onboarding/steps/StepSplitPreference.tsx`

Reduzir de 4 para 2 opções:

```text
┌────────────────────────────────────────────────────────────┐
│  OPÇÕES DE SPLIT (apenas intermediários/avançados 3x)      │
├────────────────────────────────────────────────────────────┤
│  □ Full Body 3x                                            │
│    Mesma rotina completa repetindo 3x na semana            │
├────────────────────────────────────────────────────────────┤
│  □ Híbrido (FB + A + B)                                    │
│    1 dia Full Body + A (superiores) + B (inferiores)       │
└────────────────────────────────────────────────────────────┘
```

**Remover**:
- `push_pull_legs` 
- `no_preference`

### 4. EDITAR: `src/pages/Onboarding.tsx`

- Alterar `TOTAL_STEPS` de 13 para 12
- Remover import do `StepVariation`
- Renumerar cases: 10→StepBodyAreas, 11→StepHealth, 12→StepSleepStress
- **MANTER** a lógica `shouldShowSplitStep` intacta

### 5. EDITAR: `src/types/onboarding.ts`

- Alterar `splitPreference` para: `'fullbody' | 'hybrid' | null`
- Remover `variationPreference` da interface e initialData

### 6. EDITAR: `src/components/settings/TrainingSection.tsx`

- Remover campo `variationPreference` do formData
- Remover seção de RadioGroup "Preferência de Variação"

### 7. EDITAR: `supabase/functions/generate-workout/index.ts`

#### 7.1 Substituir Seção de Variação no Prompt

```text
REGRA OBRIGATÓRIA: MÍNIMA VARIAÇÃO DE EXERCÍCIOS

Este sistema é usado em academias low cost onde a simplicidade 
operacional é crítica.

REGRAS:
- Full Body: Gerar 1 rotina que se REPETE idêntica em todos os dias
- Divisão A/B: Treino A = idêntico nos dois dias que aparecer
               Treino B = idêntico nos dois dias que aparecer

PROIBIDO:
- Criar variações do mesmo treino na mesma semana
- Trocar exercícios entre dias do mesmo tipo

PROGRESSÃO PERMITIDA:
- Aumentar carga (kg)
- Aumentar repetições
- Ajustar esforço (RR)
```

#### 7.2 Lógica do Híbrido (FB + A + B)

```text
Dia 1 - Full Body:
├── Supino, Remada, Desenvolvimento (superiores)
├── Agachamento, Stiff (inferiores)
└── ~12-15 séries

Dia 2 - Treino A (Superiores):
├── REPETIR: Supino, Remada, Desenvolvimento
├── ADICIONAR: Rosca, Tríceps, Elevação Lateral
└── Compostos + 4-6 séries extras

Dia 3 - Treino B (Inferiores):
├── REPETIR: Agachamento, Stiff
├── ADICIONAR: Leg Press, Extensora, Panturrilha
└── Compostos + 4-6 séries extras
```

#### 7.3 Alterar `getVariationLabel` para sempre retornar "MÍNIMA"

---

## Fluxo de Onboarding (Antes vs Depois)

```text
ANTES (13 steps):
1.Nome → 2.Dados → 3.Objetivo → 4.Prazo → 5.Dias
6.Duração → 7.Tipos → 8.Experiência → 9.Split(4)
10.VARIAÇÃO → 11.Áreas → 12.Saúde → 13.Sono

DEPOIS (12 steps):
1.Nome → 2.Dados → 3.Objetivo → 4.Prazo → 5.Dias
6.Duração → 7.Tipos → 8.Experiência → 9.Split(2)*
10.Áreas → 11.Saúde → 12.Sono

* Step 9 só aparece se: intermediário/avançado + 3x/semana
```

---

## Cenários por Perfil

| Perfil | Frequência | Vê Split? | Resultado |
|--------|------------|-----------|-----------|
| Iniciante | 2x | Não | Full Body automático |
| Iniciante | 3x | Não | Full Body automático |
| Iniciante | 4x | Não | A/B automático |
| Intermediário | 3x | **Sim** | Escolhe: FB ou Híbrido |
| Avançado | 3x | **Sim** | Escolhe: FB ou Híbrido |
| Intermediário | 4x | Não | A/B automático |
| Avançado | 6x | Não | PPL automático |

---

## Backward Compatibility

| Dado Existente | Tratamento |
|----------------|------------|
| `variationPreference: qualquer` | Ignorado |
| `splitPreference: "no_preference"` | Tratado como "fullbody" |
| `splitPreference: "push_pull_legs"` | Tratado como "fullbody" (3x) |

---

## Ordem de Implementação

1. **Fase A (Frontend)** - Baixo Risco
   - Deletar StepVariation.tsx
   - Atualizar exports em index.ts
   - Simplificar StepSplitPreference.tsx
   - Ajustar Onboarding.tsx (steps 13→12)
   - Remover seção em TrainingSection.tsx

2. **Fase B (Tipos)** - Médio Risco
   - Atualizar onboarding.ts types

3. **Fase C (Edge Function)** - Alto Risco
   - Atualizar seção 7.1 do prompt
   - Alterar getVariationLabel
   - Deploy e teste
