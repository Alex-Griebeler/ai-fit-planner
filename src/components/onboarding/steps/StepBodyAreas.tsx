import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { BodySelector } from '../BodySelector';
import { Button } from '@/components/ui/button';

interface StepBodyAreasProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

export function StepBodyAreas({ data, updateData, onNext, onBack, totalSteps }: StepBodyAreasProps) {
  const canProceed = data.bodyAreas.length >= 1;

  return (
    <OnboardingLayout
      step={10}
      totalSteps={totalSteps}
      title="Em quais áreas do corpo você quer focar?"
      subtitle="Selecione as áreas que você mais quer trabalhar"
      onBack={onBack}
    >
      <div className="mb-6">
        <BodySelector
          selectedAreas={data.bodyAreas}
          onChange={(areas) => updateData('bodyAreas', areas)}
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
