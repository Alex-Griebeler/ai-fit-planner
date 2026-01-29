
# Plano: Melhorias no Card de Sequencia e Historicos Colapsaveis

## 1. Redesign do Card de Sequencia (StreakCard)

### Problemas Atuais
- Layout horizontal com muita informacao competindo
- Badge "Novo recorde!" ocupa espaco visual
- Recorde separado no canto direito parece desconectado

### Sugestoes de Melhoria

**Opcao A - Minimalista**
```text
┌─────────────────────────────────────┐
│  🔥  2 dias                         │
│      Recorde: 5 dias                │
└─────────────────────────────────────┘
```

**Opcao B - Centralizado**
```text
┌─────────────────────────────────────┐
│            🔥                       │
│      Sequencia atual                │
│           2                         │
│          dias                       │
│    ─────────────────               │
│    Seu recorde: 5 dias              │
└─────────────────────────────────────┘
```

**Opcao C - Compacto com barra de progresso** (Recomendada)
```text
┌─────────────────────────────────────┐
│  🔥  2 dias de sequencia            │
│  ████████░░░░░░░░  Recorde: 5       │
└─────────────────────────────────────┘
```

### Implementacao Sugerida (Opcao C)
- Remover badge "Novo recorde!" (redundante)
- Adicionar barra de progresso mostrando distancia ate o recorde
- Layout horizontal compacto
- Destacar quando atingir/superar recorde com cor diferente

---

## 2. Cards de Historico Colapsaveis

### Comportamento Atual
- Historico de Treinos: sempre aberto, mostrando 5 sessoes
- Historico de Planos: sempre aberto com scroll interno

### Nova Proposta
Usar componente `Collapsible` do Radix para ambos os cards:

```text
Estado Fechado (padrao):
┌─────────────────────────────────────┐
│  📅 Historico de Treinos    [▼]     │
└─────────────────────────────────────┘

Estado Aberto:
┌─────────────────────────────────────┐
│  📅 Historico de Treinos    [▲]     │
├─────────────────────────────────────┤
│  ✓ Treino A - 2 dias atras          │
│  ✓ Treino B - 4 dias atras          │
│  ...                                │
└─────────────────────────────────────┘
```

### Implementacao
1. Envolver o conteudo com `Collapsible`
2. Adicionar icone de chevron no header
3. Estado inicial: fechado (`defaultOpen={false}`)
4. Animacao suave na abertura/fechamento

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/gamification/StreakCard.tsx` | Redesign com barra de progresso |
| `src/components/dashboard/SessionHistoryCard.tsx` | Adicionar Collapsible |
| `src/components/dashboard/WorkoutHistoryCard.tsx` | Adicionar Collapsible |

---

## Detalhes Tecnicos

### StreakCard Redesenhado
```typescript
// Barra de progresso ate o recorde
const progressToRecord = longestStreak > 0 
  ? Math.min((currentStreak / longestStreak) * 100, 100) 
  : 0;

return (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <Flame className="w-5 h-5 text-orange-500" />
        <div className="flex-1">
          <span className="font-bold text-lg">{currentStreak} dias</span>
          <span className="text-muted-foreground text-sm ml-1">de sequencia</span>
        </div>
      </div>
      {longestStreak > 0 && (
        <div className="mt-2">
          <Progress value={progressToRecord} className="h-1.5" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Progresso</span>
            <span>Recorde: {longestStreak}</span>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);
```

### Cards Colapsaveis
```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

<Collapsible defaultOpen={false}>
  <Card>
    <CollapsibleTrigger asChild>
      <CardHeader className="cursor-pointer hover:bg-muted/50">
        <div className="flex items-center justify-between">
          <CardTitle>Historico de Treinos</CardTitle>
          <ChevronDown className="w-4 h-4 transition-transform" />
        </div>
      </CardHeader>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <CardContent>...</CardContent>
    </CollapsibleContent>
  </Card>
</Collapsible>
```

---

## Resultado Esperado

1. **StreakCard**: Mais limpo, com progresso visual ate o recorde
2. **Historicos**: Dashboard menos poluido por padrao, usuario expande quando quiser ver detalhes
3. **UX**: Informacoes principais visiveis, detalhes sob demanda
