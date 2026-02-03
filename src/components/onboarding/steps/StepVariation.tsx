import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { Shuffle } from 'lucide-react';

interface StepVariationProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

const VARIATION_OPTIONS = [
  { value: 'high', label: 'Alta variação', desc: 'Treinos sempre diferentes e novos exercícios' },
  { value: 'moderate', label: 'Variação moderada', desc: 'Algumas mudanças regulares nos treinos' },
  { value: 'low', label: 'Pouca variação', desc: 'Treinos consistentes com poucas mudanças' },
] as const;

export function StepVariation({ data, updateData, onNext, onBack, totalSteps }: StepVariationProps) {
  const canProceed = data.variationPreference !== null;

  return (
    <OnboardingLayout
      step={9}
      totalSteps={totalSteps}
      title="Você prefere treinos com muita ou pouca variação?"
      subtitle="Isso nos ajuda a personalizar a frequência de mudanças"
      onBack={onBack}
    >
      <div className="space-y-3 mb-6">
        {VARIATION_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.label}
            description={option.desc}
            icon={<Shuffle className="w-6 h-6" />}
            selected={data.variationPreference === option.value}
            onClick={() => updateData('variationPreference', option.value)}
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
