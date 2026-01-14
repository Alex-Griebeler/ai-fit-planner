import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Crown, TrendingUp, DollarSign, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScrollToTop } from '@/hooks/useScrollToTop';
import { useAdminMetrics, Period } from '@/hooks/useAdminMetrics';
import {
  KPICard,
  MetricsChart,
  ConversionFunnel,
  PeriodSelector,
  EngagementCard,
} from '@/components/admin';

export default function AdminDashboard() {
  useScrollToTop();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('30d');
  const { metrics, isLoading, error, refetch } = useAdminMetrics(period);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => navigate('/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const periodLabel = {
    '7d': 'últimos 7 dias',
    '30d': 'últimos 30 dias',
    '90d': 'últimos 90 dias',
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Dashboard Admin</h1>
                <p className="text-sm text-muted-foreground">
                  Métricas dos {periodLabel[period]}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={refetch}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Period Selector */}
        <div className="flex justify-end">
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total de Usuários"
            value={metrics.summary.totalUsers}
            subtitle={`+${metrics.summary.newUsersInPeriod} no período`}
            icon={<Users className="w-5 h-5" />}
            trend="up"
          />
          <KPICard
            title="Usuários Premium"
            value={metrics.summary.premiumUsers}
            icon={<Crown className="w-5 h-5" />}
          />
          <KPICard
            title="Taxa de Conversão"
            value={`${metrics.summary.conversionRate}%`}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <KPICard
            title="MRR Estimado"
            value={`R$ ${metrics.summary.mrr.toFixed(2)}`}
            icon={<DollarSign className="w-5 h-5" />}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <MetricsChart
            title="Novos Usuários"
            data={metrics.timeSeries.signups}
            type="area"
            color="hsl(var(--primary))"
          />
          <MetricsChart
            title="Sessões de Treino"
            data={metrics.timeSeries.sessions}
            type="bar"
            color="hsl(142, 76%, 36%)"
          />
        </div>

        {/* Engagement & Funnel */}
        <div className="grid gap-6 lg:grid-cols-2">
          <EngagementCard
            completionRate={metrics.engagement.completionRate}
            avgDuration={metrics.engagement.avgDuration}
            avgRpe={metrics.engagement.avgRpe}
            avgStreak={metrics.engagement.avgStreak}
          />
          <ConversionFunnel
            signups={metrics.funnel.signups}
            onboarded={metrics.funnel.onboarded}
            withPlan={metrics.funnel.withPlan}
            premium={metrics.funnel.premium}
          />
        </div>
      </div>
    </div>
  );
}
