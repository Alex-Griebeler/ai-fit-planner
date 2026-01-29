import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'positive' | 'neutral' | 'negative';
}

const trendColors = {
  positive: 'text-green-500',
  neutral: 'text-muted-foreground',
  negative: 'text-red-500',
};

export function StatsCard({ icon, label, value, subtext, trend }: StatsCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg bg-primary/10",
            trend ? trendColors[trend] : "text-primary"
          )}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className={cn(
              "text-xl font-bold",
              trend ? trendColors[trend] : "text-foreground"
            )}>
              {value}
            </p>
            {subtext && (
              <p className="text-xs text-muted-foreground truncate">{subtext}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}