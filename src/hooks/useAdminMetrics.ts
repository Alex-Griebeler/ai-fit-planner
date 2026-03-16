import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

export type Period = '7d' | '30d' | '90d';

export interface LearningContextMetrics {
  totalLogs: number;
  avgVolumeMultiplier: number;
  avgCompletionRate: number;
  avgRpe: number;
  avgConfidenceScore: number;
  deloadRecommendedCount: number;
  blockedCount: number;
  intensityShiftDistribution: {
    maintain: number;
    increase: number;
    decrease: number;
  };
}

export interface AdminMetrics {
  summary: {
    totalUsers: number;
    newUsersInPeriod: number;
    premiumUsers: number;
    conversionRate: number;
    mrr: number;
    activeUsersInPeriod: number;
  };
  engagement: {
    totalSessions: number;
    completedSessions: number;
    completionRate: number;
    avgDuration: number;
    avgRpe: number;
    avgStreak: number;
  };
  funnel: {
    signups: number;
    onboarded: number;
    withPlan: number;
    premium: number;
  };
  timeSeries: {
    signups: { date: string; count: number }[];
    sessions: { date: string; count: number }[];
    conversions: { date: string; count: number }[];
  };
  learningContext: LearningContextMetrics;
}

const defaultMetrics: AdminMetrics = {
  summary: {
    totalUsers: 0,
    newUsersInPeriod: 0,
    premiumUsers: 0,
    conversionRate: 0,
    mrr: 0,
    activeUsersInPeriod: 0,
  },
  engagement: {
    totalSessions: 0,
    completedSessions: 0,
    completionRate: 0,
    avgDuration: 0,
    avgRpe: 0,
    avgStreak: 0,
  },
  funnel: {
    signups: 0,
    onboarded: 0,
    withPlan: 0,
    premium: 0,
  },
  timeSeries: {
    signups: [],
    sessions: [],
    conversions: [],
  },
  learningContext: {
    totalLogs: 0,
    avgVolumeMultiplier: 1,
    avgCompletionRate: 0,
    avgRpe: 0,
    avgConfidenceScore: 0,
    deloadRecommendedCount: 0,
    blockedCount: 0,
    intensityShiftDistribution: {
      maintain: 0,
      increase: 0,
      decrease: 0,
    },
  },
};

export function useAdminMetrics(period: Period = '30d') {
  const [metrics, setMetrics] = useState<AdminMetrics>(defaultMetrics);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const periodDays = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endDate = new Date();
      const startDate = subDays(endDate, periodDays[period]);

      const { data, error: fnError } = await supabase.functions.invoke('admin-metrics', {
        body: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        },
      });

      if (fnError) {
        throw fnError;
      }

      // Validate payload shape before using
      if (
        !data ||
        typeof data !== 'object' ||
        !data.summary || typeof data.summary.totalUsers !== 'number' ||
        !data.engagement || typeof data.engagement.totalSessions !== 'number' ||
        !data.funnel || typeof data.funnel.signups !== 'number' ||
        !data.timeSeries ||
        !data.learningContext
      ) {
        console.error('[AdminMetrics] Invalid payload shape:', JSON.stringify(data).slice(0, 200));
        throw new Error('Payload de métricas inválido');
      }

      setMetrics(data as AdminMetrics);
    } catch (err) {
      console.error('Error fetching admin metrics:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar métricas');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, isLoading, error, refetch: fetchMetrics };
}
