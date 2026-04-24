import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface StepSessionDurationProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

const DURATION_OPTIONS = [
  { value: '30min', label: '30 minutos' },
  { value: '45min', label: '45 minutos' },
  { value: '60min', label: '60 minutos' },
] as const;

export function StepSessionDuration({ data, updateData, onNext, onBack, totalSteps }: StepSessionDurationProps) {
  const canProceed = data.sessionDuration !== null;

  return (
    <OnboardingLayout
      step={5}
      totalSteps={totalSteps}
      title="Quanto tempo total você tem por sessão?"
      subtitle="Considere o tempo total da sessão. Se incluir cardio, esse tempo também entra na conta."
      onBack={onBack}
    >
      <div className="space-y-3 mb-6">
        {DURATION_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.label}
            icon={<Clock className="w-6 h-6" />}
            selected={data.sessionDuration === option.value}
            onClick={() => updateData('sessionDuration', option.value)}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-6">
        Para melhor aderência e fluxo da academia, limitamos sessões totais em até 60 minutos.
      </p>
      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        onClick={onNext}
        disabled={!canProceed}
      >
        Continuar
      </Button>
    </OnboardingLayout>
  );
}
