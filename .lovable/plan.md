
# Plano: Dashboard com Metricas de Desempenho e Assiduidade

## Resumo das Mudancas

Transformar o grid de estatisticas estaticas (Planos Criados, Treinos/Semana, etc.) em metricas dinamicas de desempenho baseadas nos dados reais de sessoes do usuario.

---

## 1. Titulo do Card Plano Ativo

**Antes**: "Plano Emagrecimento Intenso 4 Dias PPL"
**Depois**: "Plano de Emagrecimento"

### Logica
- Extrair o `goal` do `plan_data` ou do `onboardingData`
- Mapear para label portugues: `weight_loss` → "Emagrecimento", `hypertrophy` → "Hipertrofia", etc.
- Formato final: `Plano de {Objetivo}`

### Arquivo
`src/components/dashboard/ActivePlanCard.tsx`

---

## 2. Novas Metricas de Desempenho

Substituir os 4 cards estaticos por metricas calculadas:

| Metrica Atual | Nova Metrica |
|---------------|--------------|
| Planos Criados | **Treinos esta Semana** (ex: "3/4") |
| Treinos/Semana | **Taxa de Conclusao** (ex: "85%") |
| Treinos no Plano | **Intensidade Media** (RPE 1-10) |
| Duracao/Sessao | **Tempo Ativo** (min totais na semana) |

### Calculo das Metricas

```text
1. Treinos Esta Semana
   - Contar sessoes completadas nos ultimos 7 dias
   - Comparar com weekly_frequency do plano ativo
   - Exibir: "3/4" ou "100%" se atingiu meta

2. Taxa de Conclusao
   - (completed_sets / total_sets) das ultimas sessoes
   - Media ponderada das ultimas 4 sessoes
   - Exibir: "92%"

3. Intensidade Media (RPE)
   - Media de perceived_effort das sessoes da semana
   - Escala 1-10, exibir com indicador visual
   - Exibir: "7.2" com cor (verde/amarelo/vermelho)

4. Tempo Ativo
   - Soma de duration_minutes das sessoes da semana
   - Exibir: "127 min" ou "2h 07min"
```

---

## 3. Implementacao Tecnica

### 3.1 Criar Hook `usePerformanceMetrics`

```typescript
// src/hooks/usePerformanceMetrics.ts
export function usePerformanceMetrics(sessions: WorkoutSession[], weeklyGoal: number) {
  return useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7);
    const thisWeekSessions = sessions.filter(s => 
      s.status === 'completed' && 
      new Date(s.completed_at!) > sevenDaysAgo
    );
    
    // Treinos esta semana
    const workoutsThisWeek = thisWeekSessions.length;
    
    // Taxa de conclusao
    const completionRate = thisWeekSessions.length > 0
      ? thisWeekSessions.reduce((acc, s) => acc + (s.completed_sets / s.total_sets), 0) 
        / thisWeekSessions.length * 100
      : 0;
    
    // RPE medio
    const sessionsWithRpe = thisWeekSessions.filter(s => s.perceived_effort);
    const avgRpe = sessionsWithRpe.length > 0
      ? sessionsWithRpe.reduce((acc, s) => acc + s.perceived_effort!, 0) / sessionsWithRpe.length
      : null;
    
    // Tempo ativo
    const totalMinutes = thisWeekSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
    
    return {
      workoutsThisWeek,
      weeklyGoal,
      completionRate: Math.round(completionRate),
      avgRpe: avgRpe ? avgRpe.toFixed(1) : null,
      totalMinutes,
    };
  }, [sessions, weeklyGoal]);
}
```

### 3.2 Atualizar StatsCard

Adicionar suporte para indicador de cor baseado em performance:

```typescript
interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'positive' | 'neutral' | 'negative'; // Nova prop
}
```

### 3.3 Atualizar Dashboard.tsx

- Importar novo hook
- Calcular metricas a partir de `sessions`
- Renderizar novo grid

### 3.4 Atualizar ActivePlanCard.tsx

- Receber `goal` como prop ou extrair de `plan_data`
- Aplicar mapeamento para titulo limpo

---

## 4. Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/usePerformanceMetrics.ts` | **CRIAR** - novo hook |
| `src/components/dashboard/ActivePlanCard.tsx` | Titulo com formato "Plano de {Objetivo}" |
| `src/components/dashboard/StatsCard.tsx` | Adicionar prop `trend` para cores |
| `src/pages/Dashboard.tsx` | Usar novo hook, atualizar grid |

---

## 5. UX das Novas Metricas

### Treinos Esta Semana
- Icone: `Calendar`
- Valor: "3/4" ou checkmark se 100%
- Subtexto: "esta semana"

### Taxa de Conclusao
- Icone: `Target`
- Valor: "92%"
- Cor: verde ≥80%, amarelo 60-79%, vermelho <60%

### Intensidade Media
- Icone: `Flame` ou `Activity`
- Valor: "7.2"
- Subtexto: "RPE medio"
- Cor: verde 6-8, amarelo 5 ou 9, vermelho <5 ou >9

### Tempo Ativo
- Icone: `Timer`
- Valor: "2h 07min"
- Subtexto: "esta semana"

---

## 6. Fallbacks

- Sem sessoes na semana: mostrar "0" ou "-" com mensagem encorajadora
- Sem RPE registrado: mostrar "-" com tooltip explicativo
- Usuario novo: mostrar metricas zeradas sem erros

---

## Impacto e Riscos

**Baixo risco**: Todas as mudancas sao visuais e usam dados ja disponiveis.

**Beneficios**:
- Metricas acionaveis ao inves de estaticas
- Feedback imediato sobre performance
- Incentivo a manter assiduidade
