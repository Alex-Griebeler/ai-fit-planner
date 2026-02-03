import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { DaySelector } from '../DaySelector';
import { Button } from '@/components/ui/button';

interface StepTrainingDaysProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

export function StepTrainingDays({ data, updateData, onNext, onBack, totalSteps }: StepTrainingDaysProps) {
  const canProceed = data.trainingDays.length >= 1;

  return (
    <OnboardingLayout
      step={4}
      totalSteps={totalSteps}
      title="Quais dias da semana você pode treinar?"
      subtitle="Selecione os dias que funcionam melhor para sua rotina"
      onBack={onBack}
    >
      <div className="space-y-6 mb-6">
        <DaySelector
          selectedDays={data.trainingDays}
          onChange={(days) => updateData('trainingDays', days)}
        />
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
