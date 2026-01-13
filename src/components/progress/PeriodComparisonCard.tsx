import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subWeeks, isAfter, isBefore, startOfDay } from 'date-fns';

interface WorkoutSession {
  id: string;
  status: string;
  completed_sets: number;
  duration_minutes: number | null;
  started_at: string;
}

interface PeriodComparisonCardProps {
  sessions: WorkoutSession[];
}

interface ComparisonMetric {
  label: string;
  current: number;
  previous: number;
  unit: string;
  format?: (value: number) => string;
}

export function PeriodComparisonCard({ sessions }: PeriodComparisonCardProps) {
  const comparison = useMemo(() => {
    const now = new Date();
    const fourWeeksAgo = startOfDay(subWeeks(now, 4));
    const eightWeeksAgo = startOfDay(subWeeks(now, 8));

    // Split sessions into current period (last 4 weeks) and previous period (4-8 weeks ago)
    const currentPeriodSessions = sessions.filter(s => {
      const sessionDate = new Date(s.started_at);
      return isAfter(sessionDate, fourWeeksAgo) && s.status === 'completed';
    });

    const previousPeriodSessions = sessions.filter(s => {
      const sessionDate = new Date(s.started_at);
      return isAfter(sessionDate, eightWeeksAgo) && 
             isBefore(sessionDate, fourWeeksAgo) && 
             s.status === 'completed';
    });

    // Calculate metrics for each period
    const currentWorkouts = currentPeriodSessions.length;
    const previousWorkouts = previousPeriodSessions.length;

    const currentSets = currentPeriodSessions.reduce((acc, s) => acc + s.completed_sets, 0);
    const previousSets = previousPeriodSessions.reduce((acc, s) => acc + s.completed_sets, 0);

    const currentMinutes = currentPeriodSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
    const previousMinutes = previousPeriodSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

    // Average per week (4 weeks per period)
    const currentFrequency = currentWorkouts / 4;
    const previousFrequency = previousWorkouts / 4;

    return {
      workouts: { current: currentWorkouts, previous: previousWorkouts },
      sets: { current: currentSets, previous: previousSets },
      minutes: { current: currentMinutes, previous: previousMinutes },
      frequency: { current: currentFrequency, previous: previousFrequency },
    };
  }, [sessions]);

  const metrics: ComparisonMetric[] = [
    {
      label: 'Treinos',
      current: comparison.workouts.current,
      previous: comparison.workouts.previous,
      unit: '',
    },
    {
      label: 'Séries Totais',
      current: comparison.sets.current,
      previous: comparison.sets.previous,
      unit: '',
    },
    {
      label: 'Tempo Total',
      current: comparison.minutes.current,
      previous: comparison.minutes.previous,
      unit: 'min',
    },
    {
      label: 'Frequência',
      current: comparison.frequency.current,
      previous: comparison.frequency.previous,
      unit: '/sem',
      format: (v) => v.toFixed(1),
    },
  ];

  const getPercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getChangeIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (current < previous) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getChangeColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-500';
    if (current < previous) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const hasData = comparison.workouts.current > 0 || comparison.workouts.previous > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Comparativo de Períodos
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Últimas 4 semanas vs 4 semanas anteriores
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            <p>Complete mais treinos para ver comparativos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {metrics.map((metric) => {
              const change = getPercentageChange(metric.current, metric.previous);
              const displayCurrent = metric.format 
                ? metric.format(metric.current) 
                : metric.current.toString();
              
              return (
                <div key={metric.label} className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold">{displayCurrent}</span>
                    <span className="text-xs text-muted-foreground">{metric.unit}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {getChangeIcon(metric.current, metric.previous)}
                    <span className={`text-xs font-medium ${getChangeColor(metric.current, metric.previous)}`}>
                      {change > 0 ? '+' : ''}{change.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
