import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

interface ConversionFunnelProps {
  signups: number;
  onboarded: number;
  withPlan: number;
  premium: number;
  className?: string;
}

export function ConversionFunnel({
  signups,
  onboarded,
  withPlan,
  premium,
  className,
}: ConversionFunnelProps) {
  const steps: FunnelStep[] = [
    { label: 'Cadastros', value: signups, color: 'bg-blue-500' },
    { label: 'Onboarding', value: onboarded, color: 'bg-cyan-500' },
    { label: 'Com Plano', value: withPlan, color: 'bg-emerald-500' },
    { label: 'Premium', value: premium, color: 'bg-primary' },
  ];

  const maxValue = Math.max(...steps.map(s => s.value), 1);

  const getConversionRate = (from: number, to: number) => {
    if (from === 0) return 0;
    return Math.round((to / from) * 100);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => {
          const width = (step.value / maxValue) * 100;
          const prevStep = index > 0 ? steps[index - 1] : null;
          const conversionRate = prevStep 
            ? getConversionRate(prevStep.value, step.value) 
            : 100;

          return (
            <div key={step.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{step.value}</span>
                  {index > 0 && (
                    <span className="text-muted-foreground text-xs">
                      ({conversionRate}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="h-8 bg-muted rounded-lg overflow-hidden">
                <div
                  className={cn('h-full rounded-lg transition-all duration-500', step.color)}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Taxa de conversão total</span>
            <span className="font-bold text-primary">
              {getConversionRate(signups, premium)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
