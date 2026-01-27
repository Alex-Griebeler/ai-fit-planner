
# Desabilitar Rate Limit para Testes

## Diagnóstico

O rate limit está implementado nas linhas 2149-2176 da Edge Function `generate-workout/index.ts`. A verificação chama a função `check_rate_limit` do banco de dados com os parâmetros:
- `p_max_requests: 5` (máximo 5 gerações)
- `p_window_hours: 1` (por hora)

## Opções de Desabilitação

### Opção A: Aumentar Limite Temporariamente (Recomendado)
Alterar os parâmetros para valores muito altos:
```typescript
p_max_requests: 999,  // Praticamente ilimitado
p_window_hours: 1
```

**Vantagens:**
- Mantém a estrutura de rate limiting intacta
- Fácil de reverter para produção
- Logs continuam funcionando normalmente

### Opção B: Bypass Completo do Rate Limit
Comentar ou remover o bloco de verificação (linhas 2149-2176).

**Desvantagens:**
- Mais invasivo
- Maior risco de esquecer de reativar

## Plano de Execução

1. **Alterar Edge Function** (`supabase/functions/generate-workout/index.ts`)
   - Linha 2154: `p_max_requests: 5` → `p_max_requests: 999`
   - Adicionar comentário `// TEMP: Rate limit desabilitado para testes`

2. **Deploy automático** da Edge Function

3. **Testar geração de plano de 6 dias** para validar `max_tokens: 65536`

4. **Após validação, reverter** para `p_max_requests: 5`

## Código da Alteração

```text
Arquivo: supabase/functions/generate-workout/index.ts
Linha 2154

Antes:
  p_max_requests: 5,

Depois:
  p_max_requests: 999, // TEMP: Desabilitado para testes - REVERTER para 5 em produção
```

## Risco

- **Zero impacto funcional**: Apenas permite mais gerações
- **Segurança mantida**: Autenticação JWT continua ativa
- **Reversível**: Basta alterar o número de volta

## Detalhes Técnicos

A função `check_rate_limit` no banco de dados (PostgreSQL) registra cada chamada em uma tabela `rate_limits`. Com `p_max_requests: 999`, o usuário precisaria fazer 999 gerações em 1 hora para ser bloqueado.

A estrutura completa do rate limiting:
```text
supabase/functions/generate-workout/index.ts (linhas 2149-2176)
│
└── Chama: supabase.rpc('check_rate_limit', {...})
    │
    └── Função PostgreSQL: public.check_rate_limit()
        │
        └── Tabela: public.rate_limits
```
