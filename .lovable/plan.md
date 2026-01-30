
# Plano: Etapa 1 - Documentação das Diretrizes de Prescrição

## Objetivo

Criar o documento `docs/PRESCRIPTION_GUIDELINES_V1.md` que consolida TODAS as regras de prescrição atualmente implementadas na Edge Function `generate-workout`. Este documento servirá como:

1. **Baseline de referência** para comparar antes/depois de qualquer mudança
2. **Documentação oficial** das regras técnicas do sistema
3. **Fonte de verdade** para validação de ajustes futuros

---

## Conteúdo do Documento

### Seção 1: Cálculo de Volume Semanal

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    INTERSEÇÃO FREQUÊNCIA × OBJETIVO                 │
├─────────────────────────────────────────────────────────────────────┤
│  1. TABELA DE FREQUÊNCIA (séries/semana por grupo)                  │
│     - 1 dia: 4-10    │ 2 dias: 4-12   │ 3 dias: 6-15               │
│     - 4 dias: 8-18   │ 5 dias: 10-20  │ 6-7 dias: 12-20            │
│                                                                      │
│  2. TABELA DE OBJETIVO (séries/semana por grupo)                    │
│     - Emagrecimento: 8-20  │ Hipertrofia: 10-25                     │
│     - Saúde: 6-14          │ Performance: 8-18                      │
│                                                                      │
│  3. VOLUME FINAL = Interseção dos dois ranges                       │
│     Exemplo: 3 dias + Hipertrofia = max(6,10) a min(15,25) = 10-15  │
└─────────────────────────────────────────────────────────────────────┘
```

### Seção 2: Multiplicadores de Ajuste

| Fator | Condição | Multiplicador |
|-------|----------|---------------|
| **Nível** | Iniciante | ×0.85 |
| **Nível** | Intermediário | ×1.00 |
| **Nível** | Avançado | ×1.10 |
| **Recuperação** | Sono <6h OU Estresse alto | ×0.90 |
| **Learning Context V2** | Baseado em histórico | ×0.85 a ×1.15 |

### Seção 3: Volumes Mínimos Absolutos por Objetivo

| Grupamento | Hipertrofia | Emagrecimento | Saúde | Performance |
|------------|-------------|---------------|-------|-------------|
| Grande (peito, costas, quads, hams, glúteos) | 10 | 8 | 6 | 8 |
| Médio (ombros, cintura escapular) | 6 | 6 | 4 | 6 |
| Pequeno (bíceps, tríceps, panturrilha, core) | 6 | 4 | 4 | 6 |

### Seção 4: Séries por Sessão (conforme duração)

| Duração | Séries/Treino | Exercícios |
|---------|---------------|------------|
| 30 min | 12-18 | 4-6 |
| 45 min | 19-24 | 5-7 |
| 60 min | 25-30 | 6-8 |
| 60+ min | 28-36 | 7-10 |

### Seção 5: Regras de Divisão de Treino (Splits)

Documentar todas as combinações de:
- Padrão de dias (alternados, consecutivos, mistos)
- Frequência semanal (1-7 dias)
- Preferência de split do usuário

### Seção 6: Periodização Dinâmica

| Frequência | Nível | Tipo de Periodização |
|------------|-------|----------------------|
| ≤3 dias | Todos | Linear |
| ≥4 dias | Iniciante | Linear |
| ≥4 dias | Intermediário/Avançado | Linear + Ondulatória |

### Seção 7: Faixas de Repetições e Intensidade

| Objetivo | Faixa | Reps | RR | Descanso |
|----------|-------|------|-----|----------|
| Hipertrofia | Força-Hipert | 6-8 | 1-2 | 2-3min |
| Hipertrofia | Primária | 8-12 | 2-3 | 90-120s |
| Hipertrofia | Metabólico | 12-15 | 2-4 | 60-90s |
| Emagrecimento | Circuito | 12-15 | 3-4 | 30-45s |
| Saúde | Geral | 10-15 | 3-4 | 45-75s |

### Seção 8: Ordem de Exercícios

1. **Hierarquia por tipo**: Multiarticulares pesados → Secundários → Isoladores
2. **Agrupamento obrigatório**: Todos exercícios de um grupo juntos antes de mudar
3. **Posições especiais**: Core sempre ao final, panturrilha após grandes grupos de pernas

### Seção 9: Proporção Costas/Peitoral

| Cenário | Proporção Alvo |
|---------|----------------|
| Sem prioridade de peitoral | 1.10:1 a 1.25:1 (Costas > Peitoral) |
| Peitoral é prioridade | 1:1 (igualar volumes) |

### Seção 10: Cintura Escapular (Obrigatória)

- Mínimo 1 exercício/semana
- Volume: 8-14 séries/semana (grupo médio)
- Posição: Após exercícios principais de costas

### Seção 11: Adaptações por Lesão

Documentar as 6 áreas de lesão e suas contraindicações:
- Ombro, Lombar, Cervical, Joelho, Quadril, Tornozelo/Pé

### Seção 12: Estratégia de Alta Densidade (30min)

- Aquecimento: Específico (1-2 séries a 60-70% da carga)
- Priorizar compostos (70%+)
- Isolados apenas se usuário pediu área específica

### Seção 13: Learning Context V2

- Flags atuais e seu significado
- Cálculo do volumeMultiplier
- Guardrails de segurança

---

## Implementação

### Arquivo a Criar
```
docs/PRESCRIPTION_GUIDELINES_V1.md
```

### Estrutura do Arquivo

O documento terá aproximadamente 400-500 linhas contendo:
- Introdução e contexto
- Todas as 13 seções detalhadas acima
- Tabelas formatadas em Markdown
- Exemplos práticos de cálculo
- Referência às linhas do código fonte

### Fonte dos Dados

Todos os valores serão extraídos diretamente de:
- `supabase/functions/generate-workout/index.ts` (linhas 91-3791)
- Constantes: `FREQUENCY_VOLUME_RANGES`, `GOAL_VOLUME_RANGES`, `SESSION_SETS_PER_WORKOUT`
- Funções: `calculateVolumeRanges`, `determinePeriodization`, `getSplitRule`
- SYSTEM_PROMPT (linhas 1632-2545)

---

## Benefícios

1. **Rastreabilidade**: Qualquer mudança futura pode ser comparada com este baseline
2. **Debugging**: Quando um treino gerado parecer incorreto, podemos validar contra as regras documentadas
3. **Onboarding**: Novos desenvolvedores podem entender o sistema rapidamente
4. **Comunicação**: Você pode revisar as regras sem ler 3.800 linhas de código

---

## Próximos Passos (após aprovação)

1. Criar o documento `docs/PRESCRIPTION_GUIDELINES_V1.md`
2. Revisar o documento juntos para validar que todas as regras estão corretas
3. Identificar quaisquer inconsistências entre código e intenção
4. Prosseguir para Etapa 3 (Integração do volumeMultiplier)

---

## Seção Técnica

### Risco
**Nenhum** - Esta etapa é apenas criação de documentação, sem alteração de código funcional.

### Arquivos Afetados
- **Criar**: `docs/PRESCRIPTION_GUIDELINES_V1.md`
- **Modificar**: Nenhum

### Dependências
- Nenhuma nova dependência
- Nenhuma mudança de banco de dados
