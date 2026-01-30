

# Plano: Elevar Core para Grupo Grande

## Resumo

Atualmente o **Core** está classificado como grupo "small", recebendo volume mínimo de **6 séries/semana** para hipertrofia. O usuário quer que Core tenha o **mesmo tratamento dos grupos grandes** (10+ séries/semana para hipertrofia).

---

## Diagnóstico Atual

**Classificação de Grupos (linha 681-688):**
```typescript
const largeGroups = ["chest", "back", "quadriceps", "hamstrings", "glutes"];
const mediumGroups = ["shoulders", "scapular_belt"];
// Core cai no "small" por default
```

**Mínimos por Objetivo (linha 645-650):**
| Objetivo | Large | Medium | Small |
|----------|-------|--------|-------|
| Hipertrofia | 10 | 6 | 6 |
| Emagrecimento | 8 | 6 | 4 |
| Saúde | 6 | 4 | 4 |
| Performance | 8 | 6 | 6 |

**Resultado atual**: Core recebe apenas 6 séries mínimas em hipertrofia.

---

## Mudança Técnica

### Mudança Única: Adicionar `core` aos Grupos Grandes

**Arquivo**: `supabase/functions/generate-workout/index.ts`  
**Linha**: 682

**Antes:**
```typescript
const largeGroups = ["chest", "back", "quadriceps", "hamstrings", "glutes"];
```

**Depois:**
```typescript
const largeGroups = ["chest", "back", "quadriceps", "hamstrings", "glutes", "core"];
```

**Também atualizar a tabela de volume (linha 785):**

**Antes:**
```typescript
{ name: "Core", nameEN: "core", category: "small" },
```

**Depois:**
```typescript
{ name: "Core", nameEN: "core", category: "large" },
```

---

## Impacto

| Objetivo | Core Antes | Core Depois |
|----------|------------|-------------|
| Hipertrofia | 6 séries/sem | **10 séries/sem** |
| Emagrecimento | 4 séries/sem | **8 séries/sem** |
| Saúde | 4 séries/sem | **6 séries/sem** |
| Performance | 6 séries/sem | **8 séries/sem** |

---

## Atualização da Documentação

**Arquivo**: `docs/PRESCRIPTION_GUIDELINES_V1.md`

Atualizar os comentários e a documentação para refletir que Core agora é tratado como grupo grande:

```markdown
## GRUPOS GRANDES (chest, back, quadriceps, hamstrings, glutes, core):
- Hipertrofia: MÍNIMO 10 séries/semana
- Emagrecimento: MÍNIMO 8 séries/semana
- Saúde: MÍNIMO 6 séries/semana
- Performance: MÍNIMO 8 séries/semana
```

---

## Validação Pós-Implementação

1. Gerar treino com objetivo **hipertrofia**
2. Verificar nos logs/volume que Core aparece com mínimo de **10 séries**
3. Confirmar que a validação pós-IA não emite mais warnings sobre volume baixo de Core

---

## Risco

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Treinos ficam muito longos | Baixa | Volume máximo já é limitado por duração da sessão |
| IA não atinge o mínimo | Média | Validador pós-IA já emite warnings (pode ser reforçado depois) |

