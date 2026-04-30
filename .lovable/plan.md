# Conceder Acesso Premium para Emails de Teste

## Contexto

Você precisa liberar acesso Premium para 4 contas específicas para fins de teste, sem afetar os outros usuários nem a regra padrão de novos cadastros (que continuam em `free`).

Emails alvo:
- `liderunidade23@academiaevolve.com.br`
- `heloaabreusilva@gmail.com`
- `brunomz9320@gmail.com`
- `liderunidade01@academiaevolve.com.br`

## Abordagem

A tabela `public.subscriptions` controla o status (`plan_type='premium'` + `status='active'`). O hook `useSubscription` e o trigger `enforce_workout_plan_limit` já leem dessa tabela — então basta ajustar os registros desses 4 usuários ali.

Vou criar uma **migration SQL idempotente** que:

1. Resolve `user_id` a partir de `auth.users.email` para cada email da lista.
2. Faz `UPSERT` em `public.subscriptions`:
   - Se o usuário já tem subscription → atualiza para `plan_type='premium'`, `status='active'`, `current_period_end = now() + 1 ano`.
   - Se não tem → insere uma nova com os mesmos valores.
3. Ignora silenciosamente emails que ainda não existem em `auth.users` (caso o usuário não tenha se cadastrado ainda), logando um `RAISE NOTICE`.
4. Cria uma tabela de backup `legacy_premium_test_emails_backup` antes de qualquer alteração para permitir rollback.

## Arquivos

- **Novo**: `supabase/migrations/<timestamp>_grant_premium_test_emails.sql`
- **Novo**: `docs/DEPLOY_CHECKLIST_PREMIUM_TEST_EMAILS.md` — checklist de verificação e rollback

## Detalhes Técnicos

A migration usará um bloco `DO $$ ... $$` com array de emails:

```sql
DO $$
DECLARE
  test_emails TEXT[] := ARRAY[
    'liderunidade23@academiaevolve.com.br',
    'heloaabreusilva@gmail.com',
    'brunomz9320@gmail.com',
    'liderunidade01@academiaevolve.com.br'
  ];
  v_email TEXT;
  v_user_id UUID;
BEGIN
  FOREACH v_email IN ARRAY test_emails LOOP
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;
    IF v_user_id IS NULL THEN
      RAISE NOTICE 'Email % not found, skipping', v_email;
      CONTINUE;
    END IF;
    -- backup + upsert subscription para premium/active
    ...
  END LOOP;
END $$;
```

`current_period_end` será setado para `now() + interval '1 year'` para garantir que `useSubscription` valide como ativo (a checagem é `current_period_end > now()`).

## Verificação Pós-Deploy

Após aplicar a migration, rodar:

```sql
SELECT u.email, s.plan_type, s.status, s.current_period_end
FROM auth.users u
JOIN public.subscriptions s ON s.user_id = u.id
WHERE u.email IN (
  'liderunidade23@academiaevolve.com.br',
  'heloaabreusilva@gmail.com',
  'brunomz9320@gmail.com',
  'liderunidade01@academiaevolve.com.br'
);
```

Esperado: 4 linhas (ou menos, se algum email ainda não estiver cadastrado) todas com `plan_type='premium'` e `status='active'`.

## Smoke Test no App

1. Login com um dos 4 emails.
2. Ir em `/settings` → aba Assinatura → confirmar badge Premium.
3. Gerar mais de 1 plano de treino (bypass do limite free).

## Rollback

A tabela de backup permite reverter ao estado anterior caso necessário (script incluído no checklist de deploy).

## Observações

- Emails ainda não cadastrados serão pulados; basta reaplicar (ou rodar um SQL ad-hoc) depois que esses usuários se registrarem.
- O Stripe **não** é tocado — esses usuários terão Premium "manual" no banco. Quando o `check-subscription` rodar, ele primeiro lê do banco local e retorna premium imediatamente, sem precisar bater no Stripe.
- Essa abordagem é apenas para teste; em produção alinhe com a política comercial.
