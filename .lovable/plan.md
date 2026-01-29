

# Correcao do Tema: Desabilitar Reatividade ao Sistema

## Problema

O tema da aplicacao muda constantemente porque `enableSystem={true}` faz com que qualquer mudanca nas preferencias do sistema operacional sobrescreva a escolha do usuario.

## Solucao

Modificar o `ThemeProvider` no `src/App.tsx` para:
1. Desabilitar `enableSystem`
2. Adicionar `storageKey` unico para evitar conflitos

## Mudanca

**Arquivo**: `src/App.tsx` (linha 67)

```typescript
// DE:
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>

// PARA:
<ThemeProvider 
  attribute="class" 
  defaultTheme="dark" 
  enableSystem={false}
  storageKey="naifit-theme"
>
```

## Impacto

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Escolha do usuario | Sobrescrita pelo OS | Persistente |
| Opcao "Sistema" | Automatica e invasiva | Funciona apenas se selecionada |
| Conflitos localStorage | Possivel | Evitado via storageKey |

## Risco

**Baixo** - Mudanca isolada em configuracao do ThemeProvider, sem impacto em outros componentes.

