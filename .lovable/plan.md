
# Beta Premium Automático — até 30 cadastros

## Objetivo

Durante o período de testes, todo novo usuário que se cadastrar recebe Premium automaticamente, até o limite de 30 contas. Após esse período, você encerra o beta com 1 clique e os acessos são revogados em massa.

## Como vai funcionar (visão do usuário)

1. Novo usuário cria conta → trigger detecta beta ativo → assinatura criada já como `premium / active`, válida por X dias (configurável, padrão 30).
2. Quando o contador chegar a 30, novos cadastros voltam ao fluxo normal (`free`), sem precisar de nenhuma ação sua.
3. No `/admin`, novo card "Beta Premium" mostra:
   - Status (ativo/encerrado), vagas usadas (ex.: 12/30), data de expiração padrão.
   - Botão "Encerrar beta e revogar acessos" → rebaixa todos os usuários marcados como beta para `free`.
   - Lista dos emails que entraram pelo beta (auditoria).

## Implementação técnica

### 1. Tabela de configuração `beta_premium_config`
Linha única (singleton) com:
- `is_active` (bool)
- `max_slots` (int, default 30)
- `slots_used` (int, default 0)
- `default_duration_days` (int, default 30)
- `started_at`, `ended_at`

RLS: somente `admin` pode ler/escrever (via `has_role`).

### 2. Coluna em `subscriptions`
Adicionar `is_beta_grant boolean default false` para identificar quem entrou pelo beta (necessário para revogar em massa sem afetar Premium pago via Stripe).

### 3. Trigger `handle_new_user_subscription` (atualizar a existente)
Lógica nova:
```
SELECT is_active, slots_used, max_slots, default_duration_days
  FROM beta_premium_config FOR UPDATE;

IF is_active AND slots_used < max_slots THEN
  INSERT subscription (plan_type='premium', status='active',
                       current_period_end = now() + duration,
                       is_beta_grant = true);
  UPDATE beta_premium_config SET slots_used = slots_used + 1;
  IF slots_used + 1 >= max_slots THEN
    UPDATE beta_premium_config SET is_active = false, ended_at = now();
  END IF;
ELSE
  INSERT subscription (plan_type='free', status='active'); -- comportamento atual
END IF;
```
`FOR UPDATE` evita race condition em cadastros simultâneos.

### 4. Edge function `admin-beta-premium`
Endpoints (validados via `has_role(admin)`):
- `GET status` → retorna config + lista de beneficiários.
- `POST start` → ativa beta (parâmetros: `max_slots`, `default_duration_days`).
- `POST end` → desativa beta E faz `UPDATE subscriptions SET plan_type='free', status='canceled' WHERE is_beta_grant = true`.

### 5. UI Admin — `BetaPremiumCard.tsx`
Adicionado em `AdminDashboard.tsx` ao lado do `PremiumGrantCard`:
- Toggle/botão para iniciar beta (com input de slots e duração).
- Indicador visual `12 / 30` + barra de progresso.
- Botão destrutivo "Encerrar e revogar" com confirmação.
- Lista expandível dos emails beta com data de entrada.

### 6. Inicialização
Migração já cria a config inicial com `is_active = true, max_slots = 30`, então a partir do deploy os próximos 30 signups já entram como Premium.

## Fora de escopo

- Notificar por email os beta testers quando o acesso for revogado (pode adicionar depois se quiser).
- Período de carência antes da revogação.
- Estender prazo individual de algum beta tester (continua possível pelo `PremiumGrantCard` existente).

## Riscos e mitigação

- **Conflito com Stripe**: a revogação em massa filtra apenas `is_beta_grant = true`, não toca em quem assinou pago.
- **Race condition em cadastros simultâneos**: resolvida com `SELECT ... FOR UPDATE` na trigger.
- **Beta tester que assinar Stripe durante o beta**: webhook do Stripe sobrescreve `is_beta_grant` para `false` ao registrar a assinatura paga, protegendo-o da revogação. (Ajuste pequeno no `stripe-webhook`.)
