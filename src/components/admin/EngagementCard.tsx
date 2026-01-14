import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, Flame, Zap } from 'lucide-react';

interface EngagementCardProps {
  completionRate: number;
  avgDuration: number;
  avgRpe: number;
  avgStreak: number;
  className?: string;
}

export function EngagementCard({
  completionRate,
  avgDuration,
  avgRpe,
  avgStreak,
  className,
}: EngagementCardProps) {
  const metrics = [
    {
      label: 'Taxa de Conclusão',
      value: `${completionRate}%`,
      icon: Activity,
      color: 'text-green-500',
    },
    {
      label: 'Duração Média',
      value: `${avgDuration} min`,
      icon: Clock,
      color: 'text-blue-500',
    },
    {
      label: 'RPE Médio',
      value: avgRpe.toFixed(1),
      icon: Zap,
      color: 'text-yellow-500',
    },
    {
      label: 'Streak Médio',
      value: `${avgStreak} dias`,
      icon: Flame,
      color: 'text-orange-500',
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Engajamento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className={`p-2 rounded-lg bg-background ${metric.color}`}>
                <metric.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="text-lg font-bold">{metric.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
