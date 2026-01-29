import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: number;
  trendLabel?: string;
}

export function StatsCard({ icon, label, value, subtext, trend, trendLabel }: StatsCardProps) {
  const hasTrend = trend !== undefined;
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;
  const isNeutral = trend === 0;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            {hasTrend && (
              <div className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                isPositive && "text-green-600 dark:text-green-500",
                isNegative && "text-red-600 dark:text-red-500",
                isNeutral && "text-muted-foreground"
              )}>
                {isPositive && <TrendingUp className="w-3 h-3" />}
                {isNegative && <TrendingDown className="w-3 h-3" />}
                {isNeutral && <Minus className="w-3 h-3" />}
                {isPositive && '+'}
                {trend}
                {trendLabel}
              </div>
            )}
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            {subtext && (
              <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{subtext}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
