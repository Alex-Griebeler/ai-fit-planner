# Checklist de Deploy - Migration (16/03/2026)

## Objetivo

Aplicar com segurança a migration:

- `supabase/migrations/20260316191500_6f3a5c2b-restore-free-default-and-session-integrity.sql`

## Pré-requisitos

1. Supabase CLI instalado (`supabase --version`).
2. Projeto linkado (`supabase link --project-ref drudjgrbludyqdogwvqc`).
3. Credenciais de banco remoto disponíveis (se necessário `--password` ou `--db-url`).
4. Janela de deploy aprovada (migration mexe em `profiles.weight` e `workout_sessions`).

## 1. Validação local (sem aplicar)

1. Confirmar migration nova no diretório:

```bash
ls -1 supabase/migrations | tail -n 5
```

2. Revisar conteúdo da migration:

```bash
cat supabase/migrations/20260316191500_6f3a5c2b-restore-free-default-and-session-integrity.sql
```

## 2. Backup prévio

Antes de aplicar, verificar estado atual:

```sql
-- Verificar default atual da função handle_new_user_subscription
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user_subscription';

-- Verificar tipo atual de profiles.weight
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'weight';

-- Contar sessões in_progress duplicadas por usuário
SELECT user_id, COUNT(*) as cnt
FROM workout_sessions
WHERE status = 'in_progress'
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Verificar se índice já existe
SELECT indexname FROM pg_indexes
WHERE indexname = 'idx_workout_sessions_one_in_progress_per_user';
```

## 3. Aplicar migration

```bash
supabase db push
```

## 4. Verificações pós-migration

### 4.1 Função de subscription

```sql
-- Deve retornar 'free' no corpo da função
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user_subscription';
```

### 4.2 Tipo de weight

```sql
-- Deve retornar numeric com precision 5, scale 1
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'weight';
```

### 4.3 Constraint de weight

```sql
-- Deve retornar profiles_weight_check
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'profiles_weight_check';
```

### 4.4 Sessões duplicadas limpas

```sql
-- Deve retornar 0 rows (nenhum usuário com mais de 1 sessão in_progress)
SELECT user_id, COUNT(*) as cnt
FROM workout_sessions
WHERE status = 'in_progress'
GROUP BY user_id
HAVING COUNT(*) > 1;
```

### 4.5 Índice único criado

```sql
-- Deve retornar idx_workout_sessions_one_in_progress_per_user
SELECT indexname, indexdef FROM pg_indexes
WHERE indexname = 'idx_workout_sessions_one_in_progress_per_user';
```

## 5. Smoke tests

1. **Novo signup**: Criar conta nova → verificar que `subscriptions.plan_type = 'free'`
2. **Editar peso**: Alterar peso no perfil para valor decimal (ex: 72.5) → deve salvar sem erro
3. **Iniciar treino**: Iniciar sessão de treino → deve criar sessão `in_progress`
4. **Sessão duplicada**: Tentar iniciar segunda sessão → deve abandonar a anterior automaticamente (via código) ou falhar no índice único
5. **Completar treino**: Completar sessão → status deve mudar para `completed`

## 6. Rollback (se necessário)

```sql
-- Reverter função para premium (estado anterior)
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.user_id, 'premium', 'active');
  RETURN NEW;
END;
$function$;

-- Reverter weight para integer
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_weight_check;
ALTER TABLE public.profiles ALTER COLUMN weight TYPE integer USING weight::integer;

-- Remover índice único
DROP INDEX IF EXISTS idx_workout_sessions_one_in_progress_per_user;
```

## 7. Decisão de publicação

- [ ] Todas as verificações SQL passaram
- [ ] Smoke tests OK
- [ ] Sem erros no console do app
- [ ] **Aprovado para publicar em produção**
