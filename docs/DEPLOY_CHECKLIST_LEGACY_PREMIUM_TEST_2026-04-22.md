# Deploy Checklist - Legacy Premium Access (Testing)

## Objetivo
Liberar acesso Premium para usuários antigos (já existentes em `profiles`) para testes, sem alterar o padrão de novos cadastros.

Migration:
- `supabase/migrations/20260422183000_grant_legacy_users_premium_for_testing.sql`

## 1. Pré-check (obrigatório)

```sql
-- Quantos usuários legados existem
SELECT COUNT(*) AS total_legacy_users FROM public.profiles;

-- Distribuição atual de assinatura
SELECT plan_type, status, COUNT(*) AS total
FROM public.subscriptions
GROUP BY plan_type, status
ORDER BY plan_type, status;
```

## 2. Aplicar migration

```bash
supabase db push
```

## 3. Verificações pós-migration

```sql
-- Backup criado
SELECT COUNT(*) AS backup_rows
FROM public.legacy_premium_access_backup;

-- Todos os legados com subscription
SELECT COUNT(*) AS legacy_without_subscription
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.user_id
WHERE s.user_id IS NULL;

-- Todos os legados em premium/active
SELECT COUNT(*) AS legacy_not_premium_active
FROM public.subscriptions s
JOIN public.profiles p ON p.user_id = s.user_id
WHERE NOT (s.plan_type = 'premium' AND s.status = 'active');
```

Esperado:
- `backup_rows > 0`
- `legacy_without_subscription = 0`
- `legacy_not_premium_active = 0`

## 4. Smoke test app

1. Login com usuário antigo.
2. Abrir `/settings` -> aba Assinatura.
3. Confirmar badge/estado Premium.
4. Gerar mais de 1 plano para confirmar bypass do limite free.

## 5. Rollback (se necessário)

```sql
-- Reverter assinaturas que já existiam
UPDATE public.subscriptions s
SET
  plan_type = b.previous_plan_type,
  status = b.previous_status,
  current_period_start = b.previous_current_period_start,
  current_period_end = b.previous_current_period_end,
  updated_at = now()
FROM public.legacy_premium_access_backup b
WHERE b.had_subscription = true
  AND s.user_id = b.user_id;

-- Remover assinaturas criadas somente para usuários sem subscription anterior
DELETE FROM public.subscriptions s
USING public.legacy_premium_access_backup b
WHERE b.had_subscription = false
  AND s.user_id = b.user_id;
```

## 6. Observações

- Novos usuários continuam em `free` porque `handle_new_user_subscription()` permanece inalterada.
- Essa estratégia é ideal para ambiente de testes. Em produção, alinhar com política comercial antes de manter rollout.
