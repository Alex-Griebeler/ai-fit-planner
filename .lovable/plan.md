
# Plano: Simplificar DaySelector - Remover Nomes por Extenso

## Análise de Impacto

### Verificação de Dependências
| Local | Uso | Impacto da Remoção |
|-------|-----|-------------------|
| `DaySelector.tsx` | `fullLabel` apenas para badges visuais | ✅ Seguro remover |
| `workoutScheduler.ts` | `DAY_LABELS` independente | ✅ Não afetado |
| Banco de dados | Salva apenas keys (`mon`, `tue`, etc.) | ✅ Não afetado |

**Conclusão:** A remoção é segura e não corrompe nenhuma lógica.

---

## Mudanças Propostas

### Arquivo: `src/components/onboarding/DaySelector.tsx`

**Remover:**
- Bloco de badges (linhas 59-75) que exibe nomes por extenso

**Manter:**
- Calendário com iniciais (botões circulares)
- Contador de dias selecionados
- Propriedade `fullLabel` no array (útil para acessibilidade via `aria-label`)

---

## Resultado Visual

```text
Antes:
┌─────────────────────────────────────┐
│  [S] [T] [Q] [Q] [S] [S] [D]        │  ← Botões com iniciais
│                                     │
│  Segunda  Terça  Quarta  Quinta     │  ← Badges (REMOVER)
│  Sexta    Sábado                    │
│                                     │
│        6 dias selecionados          │  ← Contador
└─────────────────────────────────────┘

Depois:
┌─────────────────────────────────────┐
│  [S] [T] [Q] [Q] [S] [S] [D]        │  ← Botões com iniciais
│                                     │
│        6 dias selecionados          │  ← Contador
└─────────────────────────────────────┘
```

---

## Melhoria de Acessibilidade

Adicionar `aria-label` aos botões para leitores de tela:

```tsx
<motion.button
  aria-label={`${day.fullLabel}${isSelected ? ' - selecionado' : ''}`}
  // ...
>
```

---

## Detalhes Técnicos

### Código a Remover (linhas 59-76)
```tsx
{selectedDays.length > 0 && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-wrap gap-2"
  >
    {days
      .filter((d) => selectedDays.includes(d.key))
      .map((day) => (
        <span
          key={day.key}
          className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium"
        >
          {day.fullLabel}
        </span>
      ))}
  </motion.div>
)}
```

### Risco
- **Baixo**: Mudança puramente visual
- **Nenhuma lógica afetada**: Dados continuam usando keys (`mon`, `tue`, etc.)
