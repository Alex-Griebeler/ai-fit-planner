
# Plano: Reescrita Segura da Nomenclatura e Lógica de Priorização

## Resumo Executivo

Este plano implementa duas correções estruturais na Edge Function `generate-workout`:

1. **Nomenclatura**: Padronizar "Inferior" → "Membros Inferiores" em todos os splits
2. **Mapeamento de Prioridades**: Corrigir chaves para inglês (valores salvos no banco)
3. **Cintura Escapular Vinculada a Costas**: Quando "back" é prioridade, automaticamente incluir `scapular_belt` como prioridade também (+25%)

---

## Diagnóstico Confirmado

### Problema 1: Nomenclatura Inconsistente

**Estado atual nos splits:**

| Frequência | Estrutura Atual | Problema |
|------------|-----------------|----------|
| 3 dias (mixed) | `["Full Body", "Superior", "Inferior"]` | Usa "Inferior" |
| 4 dias (todos) | `["Superior A", "Inferior A", "Superior B", "Inferior B"]` | Usa "Inferior" |
| 5 dias (todos) | `["Superior", "Inferior", "Empurrar", "Puxar", "Pernas"]` | Mistura "Inferior" e "Pernas" |
| 6 dias (todos) | `["Empurrar A", "Puxar A", "Pernas A", ...]` | Usa "Pernas" |

**Decisão do usuário**: Padronizar para **"Membros Inferiores"**

### Problema 2: Mapeamento de `body_areas` Quebrado

**Onboarding salva em inglês** (confirmado em `StepBodyAreas.tsx`):
```typescript
const BODY_AREA_OPTIONS = [
  { value: 'chest', label: 'Peitoral' },
  { value: 'shoulders', label: 'Ombros' },
  { value: 'arms', label: 'Braços' },
  { value: 'back', label: 'Costas' },
  { value: 'core', label: 'Core' },
  { value: 'glutes', label: 'Glúteos' },
  { value: 'legs', label: 'Pernas' },
];
```

**Mapeamento atual usa chaves em português** (linhas 697-723):
```typescript
"peitoral": ["chest"],  // ❌ Nunca match com "chest" do banco
"core": ["core"],       // ✅ Único que funciona
```

### Problema 3: Cintura Escapular não Vinculada a Costas

**Requisito do usuário**: Quando "back" (Costas) é selecionado como prioridade:
- Automaticamente incluir pelo menos 1 exercício de Cintura Escapular
- Aplicar o boost de +25% também para `scapular_belt`

---

## Mudanças Técnicas

### Mudança 1: Reescrever `BODY_AREA_TO_MUSCLES`

**Arquivo**: `supabase/functions/generate-workout/index.ts`  
**Linhas**: 697-723

**Código novo:**

```typescript
// ════════════════════════════════════════════════════════════════════
// BODY AREA → MUSCLE GROUPS MAPPING
// ════════════════════════════════════════════════════════════════════
// Fonte de verdade: StepBodyAreas.tsx → BODY_AREA_OPTIONS
// Valores salvos no banco: chest, shoulders, arms, back, core, glutes, legs
// ════════════════════════════════════════════════════════════════════

const BODY_AREA_TO_MUSCLES: Record<string, string[]> = {
  // ═══ CHAVES PRIMÁRIAS (EN) - Valores salvos pelo onboarding ═══
  "chest":     ["chest"],
  "shoulders": ["shoulders"],
  "arms":      ["biceps", "triceps"],
  "back":      ["back", "scapular_belt"],  // ⭐ INCLUI CINTURA ESCAPULAR
  "core":      ["core"],
  "glutes":    ["glutes"],
  "legs":      ["quadriceps", "hamstrings", "glutes", "calves"],
  
  // ═══ ALIASES (PT) - Compatibilidade com entradas alternativas ═══
  "peitoral":      ["chest"],
  "peito":         ["chest"],
  "costas":        ["back", "scapular_belt"],  // ⭐ INCLUI CINTURA ESCAPULAR
  "dorsal":        ["back"],
  "ombros":        ["shoulders"],
  "braços":        ["biceps", "triceps"],
  "gluteos":       ["glutes"],
  "glúteos":       ["glutes"],
  "pernas":        ["quadriceps", "hamstrings", "glutes", "calves"],
  "quadriceps":    ["quadriceps"],
  "panturrilhas":  ["calves"],
  "abdomen":       ["core"],
  "abdômen":       ["core"],
  "barriga":       ["core"],
};
```

**Mudanças principais:**
- Chaves primárias em **inglês** (match com banco)
- `"back"` e `"costas"` agora incluem `"scapular_belt"` automaticamente
- Aliases em português mantidos para compatibilidade futura

### Mudança 2: Padronizar Nomenclatura para "Membros Inferiores"

**Arquivo**: `supabase/functions/generate-workout/index.ts`  
**Linhas**: 233-305

**Alterações por frequência:**

```text
┌──────────────┬─────────────────────────────────────────────────────────────────────────────┐
│ Frequência   │ Estrutura Antiga → Estrutura Nova                                           │
├──────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ 3 dias mixed │ ["Full Body", "Superior", "Inferior"]                                       │
│              │ → ["Full Body", "Superior", "Membros Inferiores"]                           │
├──────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ 3 dias cons  │ ["Empurrar (...)", "Puxar (...)", "Pernas (...)"]                           │
│              │ → ["Empurrar (...)", "Puxar (...)", "Membros Inferiores (...)"]             │
├──────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ 4 dias todos │ ["Superior A", "Inferior A", "Superior B", "Inferior B"]                    │
│              │ → ["Superior A", "Membros Inferiores A", "Superior B", "Membros Inferiores B"]│
├──────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ 5 dias todos │ ["Superior", "Inferior", "Empurrar", "Puxar", "Pernas"]                     │
│              │ → ["Superior", "Membros Inferiores A", "Empurrar", "Puxar", "Membros Inf B"]│
├──────────────┼─────────────────────────────────────────────────────────────────────────────┤
│ 6 dias todos │ ["Empurrar A", "Puxar A", "Pernas A", "Empurrar B", "Puxar B", "Pernas B"]  │
│              │ → ["Empurrar A", "Puxar A", "Membros Inf A", "Empurrar B", "Puxar B", "MI B"]│
└──────────────┴─────────────────────────────────────────────────────────────────────────────┘
```

### Mudança 3: Adicionar Log de Verificação de Prioridades

**Arquivo**: `supabase/functions/generate-workout/index.ts`  
**Após linha 750 (dentro de `buildVolumeTableWithPriorities`)**

```typescript
// Log para debug de grupos prioritários
if (bodyAreas && bodyAreas.length > 0) {
  const priorityMuscles: string[] = [];
  for (const area of bodyAreas) {
    const mapped = BODY_AREA_TO_MUSCLES[area.toLowerCase().trim()];
    if (mapped) {
      priorityMuscles.push(...mapped);
    } else {
      console.warn(`[PRIORITY] Área desconhecida: "${area}" - não mapeada`);
    }
  }
  const uniqueMuscles = [...new Set(priorityMuscles)];
  console.log(`[PRIORITY] bodyAreas: [${bodyAreas.join(', ')}] → Músculos +25%: [${uniqueMuscles.join(', ')}]`);
}
```

### Mudança 4: Atualizar Documentação

**Arquivo**: `docs/PRESCRIPTION_GUIDELINES_V1.md`

Adicionar nova seção:

```markdown
### 3.1 Boost de Volume para Grupos Prioritários (+25%)

**Constante**: `PRIORITY_BOOST = 1.25`

Quando o usuário seleciona áreas de foco no onboarding, os grupos musculares correspondentes recebem +25% de volume.

#### Mapeamento de Chaves (Banco → Músculos)

| bodyArea (EN) | Grupos Musculares Afetados |
|---------------|---------------------------|
| chest         | chest |
| shoulders     | shoulders |
| arms          | biceps, triceps |
| back          | back, scapular_belt ⭐ |
| core          | core |
| glutes        | glutes |
| legs          | quadriceps, hamstrings, glutes, calves |

⭐ **Regra Especial**: Quando "Costas" é prioridade, a Cintura Escapular também recebe o boost de +25%, garantindo pelo menos 1 exercício de deltóide posterior/romboides.
```

---

## Arquivos Afetados

| Arquivo | Tipo de Mudança | Risco |
|---------|-----------------|-------|
| `supabase/functions/generate-workout/index.ts` | Reescrita de constantes + nomenclatura | **Baixo** |
| `docs/PRESCRIPTION_GUIDELINES_V1.md` | Atualização de documentação | Nenhum |

---

## Validação Pós-Implementação

1. **Deploy da Edge Function**
2. **Gerar treino com `bodyAreas: ["back"]`** e verificar nos logs:
   ```
   [PRIORITY] bodyAreas: [back] → Músculos +25%: [back, scapular_belt]
   ```
3. **Confirmar tabela de volume** mostra `⭐ +25%` para Costas E Cintura Escapular
4. **Verificar nomenclatura** dos treinos gerados usa "Membros Inferiores" consistentemente

---

## Mitigação de Riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Aliases PT deixam de funcionar | Muito baixa | Mantidos como fallback |
| Nomenclatura quebra reordenação | Baixa | Atualizar `reorderWorkoutsByDayStructure` se necessário |
| Volume calculado incorretamente | Muito baixa | Validador pós-IA já verifica ranges |
