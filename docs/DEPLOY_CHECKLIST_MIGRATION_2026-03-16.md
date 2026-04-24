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
2. Dry-run da aplicação no remoto:
```bash
supabase db push --linked --dry-run
```
3. Conferir histórico local vs remoto:
```bash
supabase migration list --linked
```

## 2. Backup recomendado
1. Snapshot lógico do banco remoto antes do push.
2. Salvar export em storage seguro.

## 3. Aplicação
1. Aplicar migrations pendentes:
```bash
supabase db push --linked
```
2. Validar que não restaram pendências:
```bash
supabase db push --linked --dry-run
```

## 4. Verificações pós-deploy
1. Verificar função de assinatura padrão (`free` para novos usuários):
```sql
select pg_get_functiondef('public.handle_new_user_subscription'::regproc);
```
2. Verificar coluna `profiles.weight`:
```sql
select data_type, numeric_precision, numeric_scale
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'weight';
```
3. Verificar índice único para sessão em progresso:
```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'workout_sessions'
  and indexname = 'idx_workout_sessions_one_in_progress_per_user';
```
4. Garantir ausência de duplicatas `in_progress`:
```sql
select user_id, count(*)
from public.workout_sessions
where status = 'in_progress'
group by user_id
having count(*) > 1;
```

## 5. Smoke tests funcionais
1. Criar usuário novo e validar assinatura inicial gratuita.
2. Iniciar treino normal e validar criação de sessão `in_progress`.
3. Simular clique duplo em iniciar treino e validar que não cria 2 sessões em progresso.
4. Finalizar treino e conferir navegação/registro no histórico.

## 6. Rollback (plano)
1. Se houver falha após deploy:
- pausar tráfego de escrita sensível (treino/onboarding);
- restaurar backup do banco;
- reverter commit da migration no repositório antes de novo `db push`.

## Observação desta auditoria
No ambiente local desta revisão, não foi possível executar `supabase migration list --linked` porque o projeto não estava linkado na CLI.
