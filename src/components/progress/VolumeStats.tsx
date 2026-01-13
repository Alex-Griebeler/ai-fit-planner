import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, Target } from 'lucide-react';
import type { WorkoutSession } from '@/hooks/useWorkoutSessions';

interface VolumeStatsProps {
  sessions: WorkoutSession[];
}

export function VolumeStats({ sessions }: VolumeStatsProps) {
  const weeklyData = useMemo(() => {
    const weeks: { week: string; sessions: number; sets: number }[] = [];

    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), { locale: ptBR });
      const weekEnd = endOfWeek(subWeeks(new Date(), i), { locale: ptBR });

      const weekSessions = sessions.filter((s) => {
        const sessionDate = parseISO(s.started_at);
        return isWithinInterval(sessionDate, { start: weekStart, end: weekEnd });
      });

      weeks.push({
        week: format(weekStart, "'Sem.' w", { locale: ptBR }),
        sessions: weekSessions.length,
        sets: weekSessions.reduce((acc, s) => acc + s.completed_sets, 0),
      });
    }

    return weeks;
  }, [sessions]);

  const currentWeekSessions = weeklyData[weeklyData.length - 1]?.sessions || 0;
  const previousWeekSessions = weeklyData[weeklyData.length - 2]?.sessions || 0;
  const weeklyChange = previousWeekSessions > 0 
    ? Math.round(((currentWeekSessions - previousWeekSessions) / previousWeekSessions) * 100)
    : 0;

  const averageSessionsPerWeek = weeklyData.reduce((acc, w) => acc + w.sessions, 0) / weeklyData.length;
  const totalSetsThisMonth = weeklyData.reduce((acc, w) => acc + w.sets, 0);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Esta semana</span>
            </div>
            <p className="text-xl font-bold">{currentWeekSessions}</p>
            <p className="text-xs text-muted-foreground">treinos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">vs anterior</span>
            </div>
            <p className={`text-xl font-bold ${weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {weeklyChange >= 0 ? '+' : ''}{weeklyChange}%
            </p>
            <p className="text-xs text-muted-foreground">variação</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Média</span>
            </div>
            <p className="text-xl font-bold">{averageSessionsPerWeek.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">por semana</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Volume Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Volume Semanal de Treinos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'sessions' ? 'Treinos' : 'Séries',
                  ]}
                />
                <Bar 
                  dataKey="sessions" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  name="Treinos"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total de séries este mês:</span>
              <span className="font-semibold">{totalSetsThisMonth}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
