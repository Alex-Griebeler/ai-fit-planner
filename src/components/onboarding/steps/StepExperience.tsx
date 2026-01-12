import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

interface StepExperienceProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Iniciante', desc: 'Pouca ou nenhuma experiência com exercícios' },
  { value: 'intermediate', label: 'Intermediário', desc: 'Alguma experiência, treino há alguns meses' },
  { value: 'advanced', label: 'Avançado', desc: 'Muita experiência, treino há anos' },
] as const;

export function StepExperience({ data, updateData, onNext, onBack, totalSteps }: StepExperienceProps) {
  const canProceed = data.experienceLevel !== null;

  return (
    <OnboardingLayout
      step={8}
      totalSteps={totalSteps}
      title="Qual é o seu nível de experiência?"
      subtitle="Isso nos ajuda a ajustar a intensidade dos treinos"
      onBack={onBack}
    >
      <div className="space-y-3 mb-6">
        {EXPERIENCE_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.label}
            description={option.desc}
            icon={<User className="w-6 h-6" />}
            selected={data.experienceLevel === option.value}
            onClick={() => updateData('experienceLevel', option.value)}
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
