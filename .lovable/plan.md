
# Plano: Simplificar Layout dos Botões de Ação

## Situação Atual

A página tem **dois botões de download duplicados**:
1. Ícone de download no header (canto superior direito) ✓
2. Botão "Baixar PDF" na barra fixa inferior (duplicado)

## Solução Proposta

Remover a duplicação e manter cada ação em seu lugar ideal:

| Ação | Posição | Justificativa |
|------|---------|---------------|
| **Baixar PDF** | Header (ícone) | Ação secundária, já existe no lugar certo |
| **Iniciar Treino** | Fixo na parte inferior | Ação principal, merece destaque |

### Layout Visual

```text
┌───────────────────────────────┐
│ ← │   Treino A - Peito    │ ⬇ │  ← Download aqui (já existe)
├───────────────────────────────┤
│                               │
│   Lista de Exercícios         │
│   (scroll normalmente)        │
│                               │
├───────────────────────────────┤
│      [ ▶ Iniciar Treino ]     │  ← Apenas este botão fixo
└───────────────────────────────┘
```

## Alterações Técnicas

**Arquivo**: `src/pages/WorkoutPreview.tsx`

1. **Remover o botão "Baixar PDF" da barra inferior**
   - Manter apenas o botão "Iniciar Treino"
   
2. **Ajustar layout do botão único**
   - Botão ocupa largura total (`w-full` em vez de `flex-1`)
   - Altura e estilo visual mantidos

3. **Reduzir padding-bottom**
   - De `pb-36 sm:pb-32` para `pb-28 sm:pb-24` (barra menor com um só botão)

### Código Simplificado

```jsx
{/* Bottom action - apenas botão principal */}
<div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border p-4 safe-area-inset-bottom">
  <div className="max-w-lg mx-auto">
    <Button
      size="lg"
      className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 press-scale"
      onClick={handleStartWorkout}
    >
      <Play className="w-5 h-5 mr-2" />
      Iniciar Treino
    </Button>
  </div>
</div>
```

## Benefícios

- **Sem duplicação** - Download disponível apenas no header
- **Foco na ação principal** - "Iniciar Treino" fica mais destacado
- **Mais espaço** - Barra inferior menor e mais limpa
- **UX Apple** - Consistente com apps de fitness nativos

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/WorkoutPreview.tsx` | Remover botão PDF duplicado, ajustar layout |
