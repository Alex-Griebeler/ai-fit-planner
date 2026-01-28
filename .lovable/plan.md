

# Plano: Corrigir Bug de Sessões Duplicadas/Abandonadas

## Problema Identificado

Após completar um treino corretamente (com parabéns, nota de intensidade, etc.), uma **nova sessão é criada automaticamente** menos de 1 segundo depois. Isso acontece porque:

1. O `useEffect` em `WorkoutExecution.tsx` cria uma nova sessão quando `!currentSession`
2. Após completar o treino, `currentSession` fica `null` 
3. Se houver qualquer re-renderização ou navegação para `/workout`, uma nova sessão é criada
4. A nova sessão fica com status `in_progress` (aparece como "abandonada" se não completada)

### Evidência no Banco de Dados

```text
Sessão 1: 22:54:28 → 22:54:43 (completed ✅, RPE: 4)
Sessão 2: 22:54:44 (in_progress ❌, criada 0.89s depois!)
```

## Correções Propostas

### Correção 1: Evitar Criação Duplicada de Sessões

**Arquivo**: `src/hooks/useWorkoutSessions.ts`

Adicionar verificação para não criar sessão se uma foi completada recentemente (últimos 30 segundos):

```typescript
// No startMutation, adicionar verificação:
const recentlyCompleted = await supabase
  .from('workout_sessions')
  .select('completed_at')
  .eq('user_id', user.id)
  .eq('status', 'completed')
  .gte('completed_at', new Date(Date.now() - 30000).toISOString())
  .maybeSingle();

if (recentlyCompleted.data) {
  throw new Error('Session recently completed');
}
```

### Correção 2: Melhorar Guard no useEffect

**Arquivo**: `src/pages/WorkoutExecution.tsx`

Adicionar flag para evitar re-criação após montar:

```typescript
const [sessionInitialized, setSessionInitialized] = useState(false);

useEffect(() => {
  if (workout && activePlan && !currentSession && !sessionInitialized) {
    setSessionInitialized(true);
    startSession({...}).catch(console.error);
  }
}, [workout, activePlan, currentSession, sessionInitialized, startSession]);
```

### Correção 3: Limpar Sessão Atual Após Completar

**Arquivo**: `src/hooks/useWorkoutSessions.ts`

Invalidar a query de `currentSession` imediatamente após completar:

```typescript
// No completeMutation.onSuccess:
onSuccess: () => {
  queryClient.setQueryData(['workout-sessions', user?.id, 'current'], null);
  queryClient.invalidateQueries({ queryKey: ['workout-sessions', user?.id] });
},
```

### Correção 4: Verificar Status ao Montar WorkoutExecution

**Arquivo**: `src/pages/WorkoutExecution.tsx`

Adicionar verificação de URL/state para saber se deve criar sessão:

```typescript
// Verificar se veio de navegação intencional vs refresh
const location = useLocation();
const isIntentionalStart = location.state?.startWorkout === true;

useEffect(() => {
  if (workout && activePlan && !currentSession && isIntentionalStart) {
    startSession({...});
  }
}, [...]);
```

E modificar o botão "Iniciar Treino" em WorkoutPreview:

```typescript
navigate(`/workout?day=${...}`, { state: { startWorkout: true } });
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useWorkoutSessions.ts` | Adicionar proteção contra duplicatas e limpar cache |
| `src/pages/WorkoutExecution.tsx` | Melhorar lógica de inicialização de sessão |
| `src/pages/WorkoutPreview.tsx` | Passar state na navegação |

## Impacto e Mitigação

### Baixo Risco
- Mudanças são defensivas (adicionam verificações)
- Não alteram fluxo principal de dados
- Compatíveis com sessões existentes

### Testes Necessários
1. Iniciar treino → Completar → Verificar histórico
2. Iniciar treino → Fechar app → Reabrir → Verificar se retoma
3. Completar treino → Navegar para /workout → Verificar que não cria nova sessão

## Limpeza de Dados Recomendada

Executar query para limpar sessões órfãs (in_progress antigas):

```sql
UPDATE workout_sessions 
SET status = 'abandoned' 
WHERE status = 'in_progress' 
AND started_at < NOW() - INTERVAL '2 hours';
```

