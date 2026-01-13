import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { Dumbbell, Target, Layers, Shuffle } from 'lucide-react';

interface StepSplitPreferenceProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

const SPLIT_OPTIONS = [
  { 
    value: 'fullbody', 
    label: 'Full Body 3x', 
    desc: 'Treino completo cada dia, ideal para recuperação entre sessões',
    icon: Dumbbell,
  },
  { 
    value: 'push_pull_legs', 
    label: 'Push/Pull/Legs', 
    desc: 'Divisão por padrão de movimento, foco em cada grupo muscular',
    icon: Target,
  },
  { 
    value: 'hybrid', 
    label: 'Híbrido (FB + A/B)', 
    desc: '1 dia completo + 2 especializados, garante 2 estímulos por grupo',
    icon: Layers,
  },
  { 
    value: 'no_preference', 
    label: 'Sem Preferência', 
    desc: 'Full Body variado - exercícios diferentes cada dia, sem repetição',
    icon: Shuffle,
  },
] as const;

export function StepSplitPreference({ data, updateData, onNext, onBack, totalSteps }: StepSplitPreferenceProps) {
  const canProceed = data.splitPreference !== null;

  return (
    <OnboardingLayout
      step={9}
      totalSteps={totalSteps}
      title="Como prefere dividir seus treinos?"
      subtitle="Escolha a estrutura que mais combina com você"
      onBack={onBack}
    >
      <div className="space-y-3 mb-6">
        {SPLIT_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <OptionCard
              key={option.value}
              title={option.label}
              description={option.desc}
              icon={<Icon className="w-6 h-6" />}
              selected={data.splitPreference === option.value}
              onClick={() => updateData('splitPreference', option.value)}
            />
          );
        })}
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
