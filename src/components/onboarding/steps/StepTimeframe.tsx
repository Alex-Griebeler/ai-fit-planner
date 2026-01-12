import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface StepTimeframeProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

const TIMEFRAME_OPTIONS = [
  { value: '3months', label: '3 meses', desc: 'Mudanças visíveis' },
  { value: '6months', label: '6 meses', desc: 'Transformação completa' },
  { value: '12months', label: '+12 meses', desc: 'Mudança de estilo de vida' },
] as const;

export function StepTimeframe({ data, updateData, onNext, onBack, totalSteps }: StepTimeframeProps) {
  const canProceed = data.timeframe !== null;

  return (
    <OnboardingLayout
      step={4}
      totalSteps={totalSteps}
      title="Em quanto tempo você quer alcançar seus objetivos?"
      subtitle="Isso nos ajuda a criar um plano realista para você"
      onBack={onBack}
    >
      <div className="space-y-3 mb-6">
        {TIMEFRAME_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.label}
            description={option.desc}
            icon={<Clock className="w-6 h-6" />}
            selected={data.timeframe === option.value}
            onClick={() => updateData('timeframe', option.value)}
          />
        ))}
      </div>
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
