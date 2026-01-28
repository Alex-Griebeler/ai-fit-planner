
# Plano: Botão "Iniciar Treino" Integrado ao Scroll

## Mudança Proposta

Mover o botão "Iniciar Treino" de **fixo na parte inferior** para **dentro do fluxo de conteúdo**, logo após a lista de exercícios.

## Layout Visual

```text
┌───────────────────────────────┐
│ ← │   Treino A - Peito    │ ⬇ │  ← Download PDF (header)
├───────────────────────────────┤
│                               │
│   #1 Supino Reto              │
│   #2 Supino Inclinado         │
│   #3 Crucifixo                │
│   ...                         │
│                               │
│  ┌─────────────────────────┐  │
│  │   ▶ Iniciar Treino      │  │  ← Rola junto com conteúdo
│  └─────────────────────────┘  │
│                               │
└───────────────────────────────┘
```

## Alterações Técnicas

**Arquivo**: `src/pages/WorkoutPreview.tsx`

1. **Remover `fixed` positioning**
   - Eliminar `fixed bottom-0 left-0 right-0 z-50`
   - Botão passa a fazer parte do fluxo normal

2. **Mover botão para dentro do `<main>`**
   - Colocar após a lista de exercícios
   - Adicionar espaçamento: `mt-6 mb-8`

3. **Simplificar padding**
   - Remover `pb-28 sm:pb-24` (não precisa mais compensar barra fixa)
   - Usar padding normal da página

4. **Manter estilo visual do botão**
   - Largura total, altura 56px, arredondado
   - Efeito `press-scale` para feedback tátil

### Código Simplificado

```jsx
<main className="flex-1 overflow-y-auto p-4">
  <div className="max-w-lg mx-auto space-y-3">
    {/* Lista de exercícios */}
    {workout.exercises.map((exercise, index) => (
      <ExerciseCard key={index} exercise={exercise} />
    ))}
    
    {/* Botão de ação - DENTRO do scroll */}
    <div className="pt-6 pb-8">
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
</main>
```

## Benefícios

- **Tela mais limpa** - Sem barra fixa ocupando espaço
- **Zero sobreposição** - Impossível cobrir conteúdo
- **Fluxo natural** - "Revisei tudo → Iniciar"
- **Código mais simples** - Sem z-index, fixed, safe-area
- **Consistente** - Mesmo padrão do ícone de download no header

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/WorkoutPreview.tsx` | Mover botão de `fixed` para fluxo inline |
