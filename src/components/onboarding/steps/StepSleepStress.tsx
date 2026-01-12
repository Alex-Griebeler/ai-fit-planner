import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { Moon, Zap, Loader2 } from 'lucide-react';

interface StepSleepStressProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onFinish: () => void;
  onBack: () => void;
  totalSteps: number;
  isLoading: boolean;
}

const SLEEP_OPTIONS = [
  { value: 'less5', label: 'Menos de 5h' },
  { value: '5-6', label: '5-6h' },
  { value: '6-7', label: '6-7h' },
  { value: '7-8', label: '7-8h' },
  { value: 'more8', label: 'Mais de 8h' },
];

const STRESS_OPTIONS = [
  { value: 'low', label: 'Baixo', icon: Moon },
  { value: 'moderate', label: 'Moderado', icon: Moon },
  { value: 'high', label: 'Alto', icon: Zap },
] as const;

export function StepSleepStress({ data, updateData, onFinish, onBack, totalSteps, isLoading }: StepSleepStressProps) {
  const canProceed = data.sleepHours !== null && data.stressLevel !== null;

  return (
    <OnboardingLayout
      step={12}
      totalSteps={totalSteps}
      title="Sono e Estresse"
      subtitle="Essas informações nos ajudam a ajustar a intensidade dos treinos"
      onBack={onBack}
    >
      <div className="space-y-6 mb-6">
        <div>
          <label className="text-sm text-muted-foreground mb-3 block">
            Quantas horas você dorme por noite?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SLEEP_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={data.sleepHours === option.value ? 'default' : 'outline'}
                onClick={() => updateData('sleepHours', option.value)}
                className="h-11"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-3 block">
            Qual seu nível de estresse no dia a dia?
          </label>
          <div className="space-y-2">
            {STRESS_OPTIONS.map((option) => (
              <OptionCard
                key={option.value}
                title={option.label}
                icon={<option.icon className="w-5 h-5" />}
                selected={data.stressLevel === option.value}
                onClick={() => updateData('stressLevel', option.value)}
              />
            ))}
          </div>
        </div>
      </div>

      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        onClick={onFinish}
        disabled={!canProceed || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Salvando...
          </>
        ) : (
          'Finalizar Questionário'
        )}
      </Button>
    </OnboardingLayout>
  );
}
