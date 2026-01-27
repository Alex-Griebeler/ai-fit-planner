# Especificação Técnica: Learning Context Fase 2
## Sistema de Ajuste Dinâmico de Volume Baseado em Frequência Real

**Versão:** 1.0  
**Data:** 2026-01-27  
**Status:** Proposta Técnica

---

## 1. Visão Geral

### 1.1 Objetivo
Evoluir o sistema de prescrição de treinos para ajustar automaticamente o volume semanal e intensidade com base no comportamento real do usuário, eliminando a necessidade de inputs manuais sobre progressão.

### 1.2 Princípio Central
> "Um treinador de elite não pergunta ao aluno como quer progredir — ele observa, analisa e ajusta."

### 1.3 Estado Atual (Fase 1)
- Learning Context coleta dados históricos (últimas 10 sessões, 100 cargas)
- Calcula métricas: RPE médio, taxa de conclusão, progressões detectadas
- Passa informações como **texto sugestivo** no prompt da IA
- Volume/progressão removidos do UI (implementado)

---

## 2. Arquitetura do Sistema de Ajuste

### 2.1 Fluxo de Dados

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ workout_sessions│───▶│ Learning Context │───▶│ Volume Calculator│
│ (histórico real)│    │   (análise)      │    │  (ajuste)        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Guardrails     │───▶│  AI Prompt      │
                       │  (validação)     │    │ (prescrição)    │
                       └──────────────────┘    └─────────────────┘
```

### 2.2 Componentes Principais

| Componente | Responsabilidade | Localização |
|------------|------------------|-------------|
| Session Analyzer | Extrai métricas das sessões | Edge Function |
| Frequency Detector | Detecta frequência real vs planejada | Edge Function |
| Volume Adjuster | Calcula ajustes de volume | Edge Function |
| Guardrail Validator | Impõe limites de segurança | Edge Function |
| Context Injector | Formata instruções para IA | Edge Function |

---

## 3. Regras de Ajuste Dinâmico

### 3.1 Ajuste por Frequência Real

#### Cenário: Usuário treina MENOS que o planejado

| Frequência Planejada | Frequência Real | Ajuste de Volume |
|----------------------|-----------------|------------------|
| 5 dias/semana | 3-4 dias | +10% por sessão (compensar) |
| 5 dias/semana | 1-2 dias | Manter volume base (não sobrecarregar) |
| 4 dias/semana | 2-3 dias | +5% por sessão |
| 3 dias/semana | 1-2 dias | Manter volume base |

**Lógica:** Se o usuário treina menos, cada sessão deve ser ligeiramente mais densa, mas sem ultrapassar limites de fadiga.

#### Cenário: Usuário treina MAIS que o planejado

| Frequência Planejada | Frequência Real | Ajuste de Volume |
|----------------------|-----------------|------------------|
| 3 dias/semana | 4-5 dias | -10% por sessão (distribuir) |
| 4 dias/semana | 5-6 dias | -5% por sessão |

**Lógica:** Distribuir volume para evitar overreaching.

### 3.2 Ajuste por RPE Médio

| RPE Médio (últimas 5 sessões) | Ação |
|-------------------------------|------|
| ≤ 5 | Aumentar intensidade +5% (subutilização) |
| 6-7 | Zona ideal - manter |
| 7.5-8 | Monitorar - próximo ao limite |
| 8.5-9 | Reduzir volume -10% (fadiga acumulada) |
| ≥ 9.5 | **Deload obrigatório** (-30% volume) |

### 3.3 Ajuste por Taxa de Conclusão

| Taxa de Conclusão (séries completadas/prescritas) | Ação |
|---------------------------------------------------|------|
| ≥ 95% | Volume adequado ou subótimo - pode aumentar |
| 85-94% | Volume ideal |
| 70-84% | Reduzir -5% (prescrição muito agressiva) |
| < 70% | Reduzir -15% + investigar (lesão? tempo?) |

### 3.4 Matriz de Decisão Combinada

```
                    RPE Baixo (≤6)    RPE Médio (6-8)    RPE Alto (>8)
                    ─────────────────────────────────────────────────
Conclusão Alta     │ ↑ Volume +10%  │ Manter          │ ↓ Volume -5%
(≥90%)             │                │                 │
                   │────────────────│─────────────────│───────────────
Conclusão Média    │ ↑ Volume +5%   │ Manter          │ ↓ Volume -10%
(75-89%)           │                │                 │
                   │────────────────│─────────────────│───────────────
Conclusão Baixa    │ Investigar     │ ↓ Volume -10%   │ ↓ Volume -20%
(<75%)             │ (motivação?)   │                 │ (overreaching)
```

---

## 4. Guardrails de Segurança

### 4.1 Limites Absolutos

| Parâmetro | Limite Mínimo | Limite Máximo | Justificativa |
|-----------|---------------|---------------|---------------|
| Ajuste por ciclo | -20% | +15% | Evitar oscilações bruscas |
| Volume semanal total | 8 séries/grupo | 25 séries/grupo* | Limites fisiológicos |
| Séries por sessão (30min) | 10 | 16 | Limite de tempo |
| Séries por sessão (45min) | 16 | 26 | Limite de tempo |
| Séries por sessão (60min) | 22 | 32 | Limite de tempo |

*Exceto para atletas avançados com histórico comprovado

### 4.2 Regras de Bloqueio

O sistema **NÃO PODE** aplicar ajustes automáticos quando:

1. **Dados insuficientes**: < 5 sessões registradas
2. **Inconsistência temporal**: Gap > 14 dias entre sessões
3. **Dados suspeitos**: RPE sempre 10 ou sempre 1 (provável erro de input)
4. **Primeiro ciclo**: Usuário ainda está no primeiro plano de treino

### 4.3 Cooldown de Ajustes

- Após um ajuste significativo (>10%), aguardar **mínimo 2 semanas** antes do próximo
- Deloads automáticos só podem ser sugeridos **1x a cada 4 semanas**
- Aumentos de volume são limitados a **+5% por semana** (progressão linear segura)

---

## 5. Implementação Técnica

### 5.1 Estrutura de Dados do Learning Context (v2)

```typescript
interface LearningContextV2 {
  // Dados brutos
  sessionsAnalyzed: number;
  dateRange: { start: string; end: string };
  
  // Métricas calculadas
  metrics: {
    avgRPE: number;
    rpeStdDev: number;
    completionRate: number;
    avgSessionDuration: number;
    actualFrequency: number; // dias/semana reais
    plannedFrequency: number; // dias/semana planejados
  };
  
  // Ajustes recomendados
  adjustments: {
    volumeMultiplier: number; // 0.8 a 1.15
    intensityShift: 'maintain' | 'increase' | 'decrease';
    deloadRecommended: boolean;
    confidenceScore: number; // 0-1
  };
  
  // Flags de segurança
  guardrails: {
    canApplyAdjustments: boolean;
    blockedReason?: string;
    lastAdjustmentDate?: string;
    cooldownActive: boolean;
  };
  
  // Contexto textual para IA
  promptContext: string;
}
```

### 5.2 Função de Cálculo de Ajuste

```typescript
function calculateVolumeAdjustment(metrics: LearningMetrics): number {
  let multiplier = 1.0;
  
  // Ajuste por frequência
  const frequencyRatio = metrics.actualFrequency / metrics.plannedFrequency;
  if (frequencyRatio < 0.7) {
    multiplier += 0.05; // Treina muito menos - leve compensação
  } else if (frequencyRatio > 1.2) {
    multiplier -= 0.08; // Treina muito mais - distribuir
  }
  
  // Ajuste por RPE
  if (metrics.avgRPE >= 8.5) {
    multiplier -= 0.10;
  } else if (metrics.avgRPE <= 5.5) {
    multiplier += 0.05;
  }
  
  // Ajuste por conclusão
  if (metrics.completionRate < 0.75) {
    multiplier -= 0.10;
  } else if (metrics.completionRate >= 0.95 && metrics.avgRPE < 7) {
    multiplier += 0.05;
  }
  
  // Aplicar guardrails
  return Math.max(0.80, Math.min(1.15, multiplier));
}
```

### 5.3 Integração com Prompt da IA

```typescript
function buildAdjustedPrompt(context: LearningContextV2): string {
  if (!context.guardrails.canApplyAdjustments) {
    return `[LEARNING CONTEXT - MODO OBSERVAÇÃO]
    Dados insuficientes para ajustes automáticos.
    Razão: ${context.guardrails.blockedReason}
    Usar prescrição padrão.`;
  }
  
  const volumeChange = ((context.adjustments.volumeMultiplier - 1) * 100).toFixed(0);
  const sign = context.adjustments.volumeMultiplier >= 1 ? '+' : '';
  
  return `[LEARNING CONTEXT - AJUSTE ATIVO]
  Confiança: ${(context.adjustments.confidenceScore * 100).toFixed(0)}%
  
  AJUSTE DE VOLUME: ${sign}${volumeChange}%
  - Aplicar multiplicador ${context.adjustments.volumeMultiplier} ao volume base
  - Intensidade: ${context.adjustments.intensityShift}
  ${context.adjustments.deloadRecommended ? '⚠️ DELOAD RECOMENDADO NESTE CICLO' : ''}
  
  MÉTRICAS BASE:
  - RPE médio: ${context.metrics.avgRPE}/10
  - Taxa conclusão: ${(context.metrics.completionRate * 100).toFixed(0)}%
  - Frequência real: ${context.metrics.actualFrequency} dias/sem
  
  INSTRUÇÕES:
  - Respeitar o multiplicador de volume indicado
  - Priorizar qualidade sobre quantidade se RPE > 8`;
}
```

---

## 6. Validação e Testes

### 6.1 Casos de Teste Obrigatórios

| ID | Cenário | Input | Output Esperado |
|----|---------|-------|-----------------|
| T01 | Usuário consistente, RPE 7 | 10 sessões, 95% conclusão | Manter volume (×1.0) |
| T02 | Usuário fadigado | RPE 9, 70% conclusão | Reduzir -15% (×0.85) |
| T03 | Usuário subutilizando | RPE 5, 100% conclusão | Aumentar +10% (×1.10) |
| T04 | Dados insuficientes | 3 sessões | Bloqueado, usar padrão |
| T05 | Frequência irregular | 5 dias planejados, 2 reais | +5%, não mais (segurança) |

### 6.2 Métricas de Sucesso

| Métrica | Target | Medição |
|---------|--------|---------|
| Taxa de conclusão pós-ajuste | ≥ 85% | Média 4 semanas após ajuste |
| RPE médio pós-ajuste | 6.5-7.5 | Média 4 semanas após ajuste |
| Retenção de usuários | +10% | Comparar com baseline |
| Sessões abandonadas | -20% | Comparar com baseline |

---

## 7. Rollout Plan

### 7.1 Fases de Implementação

| Fase | Escopo | Duração | Critério de Sucesso |
|------|--------|---------|---------------------|
| Alpha | 5% usuários, apenas logging | 2 semanas | Nenhum erro, dados coletados |
| Beta | 20% usuários, ajustes ativos | 4 semanas | Taxa conclusão ≥ 85% |
| GA | 100% usuários | Indefinido | Métricas de sucesso atingidas |

### 7.2 Feature Flags

```typescript
const LEARNING_CONTEXT_V2_FLAGS = {
  enabled: false, // Master switch
  loggingOnly: true, // Log mas não aplica ajustes
  maxAdjustment: 0.10, // Limite inicial conservador
  minSessions: 5, // Mínimo para ativar
  userPercentage: 0.05, // % de usuários no experimento
};
```

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Loop de redução infinita | Média | Alto | Limite mínimo absoluto de volume |
| Conflito com validador | Alta | Médio | Learning Context pode override com flag |
| Viés de RPE do usuário | Alta | Médio | Usar múltiplas métricas, não só RPE |
| Regressão de performance | Baixa | Alto | Feature flags + rollback automático |

---

## 9. Próximos Passos

1. [ ] Aprovação desta especificação
2. [ ] Implementar estrutura LearningContextV2 (sem ajustes ativos)
3. [ ] Adicionar logging detalhado para coleta de dados
4. [ ] Criar dashboard interno para monitorar métricas
5. [ ] Fase Alpha: Logging only
6. [ ] Fase Beta: Ajustes ativos para grupo de teste
7. [ ] GA: Rollout completo

---

## Changelog

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-01-27 | Sistema | Versão inicial |
