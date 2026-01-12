import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface StepNameProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  totalSteps: number;
}

export function StepName({ data, updateData, onNext, totalSteps }: StepNameProps) {
  const canProceed = data.name.trim().length >= 2;

  return (
    <OnboardingLayout
      step={1}
      totalSteps={totalSteps}
      title="Como gostaria de ser chamado(a)?"
      subtitle="Tornando sua experiência personalizada"
      showBack={false}
    >
      <div className="space-y-6">
        <Input
          placeholder="Ex: João, Maria, Nina..."
          value={data.name}
          onChange={(e) => updateData('name', e.target.value)}
          className="text-lg"
          autoFocus
        />
        <Button
          variant="gradient"
          size="lg"
          className="w-full"
          onClick={onNext}
          disabled={!canProceed}
        >
          Continuar
        </Button>
      </div>
    </OnboardingLayout>
  );
}
