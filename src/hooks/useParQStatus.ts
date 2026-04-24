import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import {
  PAR_Q_VERSION,
  PAR_Q_EXPIRATION_DAYS,
  ParQAnswers,
  ParQStatus,
} from '@/types/parQ';

interface ParQResponseRow {
  id: string;
  user_id: string;
  version: number;
  answers: ParQAnswers;
  any_yes: boolean;
  submitted_at: string;
}

function computeStatus(row: ParQResponseRow | null): ParQStatus {
  if (!row) {
    return { requiresAnswers: true, blocked: false, lastSubmittedAt: null };
  }

  if (row.version !== PAR_Q_VERSION) {
    return { requiresAnswers: true, blocked: false, lastSubmittedAt: row.submitted_at };
  }

  const submittedAt = new Date(row.submitted_at);
  const ageDays = (Date.now() - submittedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays > PAR_Q_EXPIRATION_DAYS) {
    return { requiresAnswers: true, blocked: false, lastSubmittedAt: row.submitted_at };
  }

  return {
    requiresAnswers: false,
    blocked: row.any_yes,
    lastSubmittedAt: row.submitted_at,
  };
}

// Fail-open default used when the PAR-Q table is unavailable (e.g. the
// migration has not been applied yet). Blocking the entire app in that
// case would be worse than letting the user through.
const FAIL_OPEN_STATUS: ParQStatus = {
  requiresAnswers: false,
  blocked: false,
  lastSubmittedAt: null,
};

export function useParQStatus() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['par-q-status', user?.id],
    queryFn: async (): Promise<ParQStatus> => {
      if (!user?.id) return FAIL_OPEN_STATUS;

      const { data, error } = await supabase
        .from('par_q_responses')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[PAR-Q] status lookup failed, allowing through:', error.message);
        return FAIL_OPEN_STATUS;
      }
      return computeStatus((data as ParQResponseRow | null) ?? null);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  return {
    status: query.data ?? FAIL_OPEN_STATUS,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useSubmitParQ() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (answers: ParQAnswers) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const anyYes = Object.values(answers).some(Boolean);

      const { data, error } = await supabase
        .from('par_q_responses')
        .insert({
          user_id: user.id,
          version: PAR_Q_VERSION,
          answers,
          any_yes: anyYes,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ParQResponseRow;
    },
    onSuccess: (row) => {
      // Seed the cache with the fresh status synchronously so a navigation
      // immediately after submit does not read stale data and bounce the
      // user back to the questionnaire.
      queryClient.setQueryData<ParQStatus>(
        ['par-q-status', user?.id],
        computeStatus(row),
      );
    },
  });
}
