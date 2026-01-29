import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
}

export function StatsCard({ icon, label, value, subtext }: StatsCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {subtext && (
              <p className="text-xs text-muted-foreground truncate">{subtext}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
