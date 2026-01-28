

# Plano: Correção do Layout da Página /workout-preview

## Problema Identificado

Os botões "Baixar PDF" e "Iniciar Treino" não aparecem no modo smartphone porque a **BottomNav** (barra de navegação inferior) está sobrepondo a barra de ações fixa da página.

### Causa Raiz
- A página `/workout-preview` tem uma barra de ações fixa em `bottom-0` com `z-50`
- A BottomNav global também usa `fixed bottom-0` com `z-50`
- Ambos os elementos competem pela mesma posição, e a BottomNav cobre os botões
- A BottomNav tem altura de 64px (h-16), mais a área segura iOS

## Solução Proposta

### 1. Ocultar BottomNav na página /workout-preview

**Arquivo**: `src/components/BottomNav.tsx`

Adicionar `/workout-preview` à lista de rotas onde a BottomNav deve ser ocultada. Isso é consistente com o comportamento atual de ocultar a nav durante `/workout` (execução).

```text
Antes:
hiddenRoutes = ['/', '/login', '/reset-password', '/onboarding', '/pricing']
isWorkoutExecution = pathname === '/workout'

Depois:
hiddenRoutes = ['/', '/login', '/reset-password', '/onboarding', '/pricing']
isWorkoutFlow = pathname === '/workout' || pathname === '/workout-preview'
```

### 2. Ajustar padding-bottom para todos os dispositivos

**Arquivo**: `src/pages/WorkoutPreview.tsx`

Otimizar o espaçamento inferior da área de conteúdo para garantir que os exercícios não fiquem cobertos pela barra de ações em todos os tamanhos de tela:

- **Mobile**: `pb-36` (144px) - altura da barra de ações + margem
- **Tablet/Desktop**: `pb-32` (128px) - botões maiores em telas maiores

### 3. Melhorar responsividade da barra de ações

**Arquivo**: `src/pages/WorkoutPreview.tsx`

Ajustar a barra de ações fixa para melhor adaptação em diferentes tamanhos:

```text
- Mobile: Layout atual com botões flex-1
- Tablet: Aumentar max-width e espaçamento
- Desktop: Centralizar com max-width maior, botões mais proeminentes
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/BottomNav.tsx` | Ocultar nav em `/workout-preview` |
| `src/pages/WorkoutPreview.tsx` | Ajustar padding e responsividade da barra de ações |

## Resultado Esperado

- **Smartphone**: Botões visíveis e funcionais na parte inferior da tela
- **Tablet**: Layout adaptado com espaçamento adequado
- **Desktop**: Botões centralizados com largura máxima confortável

