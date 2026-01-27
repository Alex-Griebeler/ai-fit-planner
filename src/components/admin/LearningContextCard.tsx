import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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

interface LearningContextCardProps {
  metrics: LearningContextMetrics;
}

export function LearningContextCard({ metrics }: LearningContextCardProps) {
  const volumeChange = ((metrics.avgVolumeMultiplier - 1) * 100).toFixed(1);
  const isPositive = metrics.avgVolumeMultiplier >= 1;

  const getShiftIcon = (shift: string) => {
    switch (shift) {
      case 'increase':
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'decrease':
        return <TrendingDown className="w-3 h-3 text-red-500" />;
      default:
        return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const totalShifts =
    metrics.intensityShiftDistribution.maintain +
    metrics.intensityShiftDistribution.increase +
    metrics.intensityShiftDistribution.decrease;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="w-5 h-5 text-primary" />
          Learning Context V2
          <Badge variant="secondary" className="ml-auto text-xs">
            Logging Only
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Logs */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Logs coletados</span>
          <span className="font-semibold">{metrics.totalLogs}</span>
        </div>

        {/* Volume Multiplier Average */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ajuste médio de volume</span>
            <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{volumeChange}%
            </span>
          </div>
          <Progress 
            value={Math.min(100, Math.max(0, (metrics.avgVolumeMultiplier - 0.8) / 0.35 * 100))} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-20%</span>
            <span>0%</span>
            <span>+15%</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Taxa Conclusão</p>
            <p className="font-semibold">{(metrics.avgCompletionRate * 100).toFixed(0)}%</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">RPE Médio</p>
            <p className="font-semibold">{metrics.avgRpe.toFixed(1)}/10</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Confiança</p>
            <p className="font-semibold">{(metrics.avgConfidenceScore * 100).toFixed(0)}%</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Deloads Sugeridos</p>
            <p className="font-semibold">{metrics.deloadRecommendedCount}</p>
          </div>
        </div>

        {/* Intensity Shift Distribution */}
        {totalShifts > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Distribuição de Intensidade</p>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-1 p-2 rounded bg-muted/50">
                {getShiftIcon('maintain')}
                <span className="text-xs">Manter</span>
                <span className="ml-auto text-xs font-medium">
                  {Math.round((metrics.intensityShiftDistribution.maintain / totalShifts) * 100)}%
                </span>
              </div>
              <div className="flex-1 flex items-center gap-1 p-2 rounded bg-muted/50">
                {getShiftIcon('increase')}
                <span className="text-xs">↑</span>
                <span className="ml-auto text-xs font-medium">
                  {Math.round((metrics.intensityShiftDistribution.increase / totalShifts) * 100)}%
                </span>
              </div>
              <div className="flex-1 flex items-center gap-1 p-2 rounded bg-muted/50">
                {getShiftIcon('decrease')}
                <span className="text-xs">↓</span>
                <span className="ml-auto text-xs font-medium">
                  {Math.round((metrics.intensityShiftDistribution.decrease / totalShifts) * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Guardrails Status */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {metrics.blockedCount > 0 ? (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
            <span className="text-sm text-muted-foreground">
              {metrics.blockedCount} bloqueados por guardrails
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
