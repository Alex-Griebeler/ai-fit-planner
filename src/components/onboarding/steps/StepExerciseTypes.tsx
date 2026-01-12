import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { Dumbbell } from 'lucide-react';

interface StepExerciseTypesProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

const EXERCISE_TYPE_OPTIONS = [
  { value: 'machines', label: 'Máquinas', desc: 'Máquinas e equipamentos de academia' },
  { value: 'free_weights', label: 'Pesos livres', desc: 'Halteres, barras e anilhas' },
  { value: 'bodyweight', label: 'Peso corporal', desc: 'Exercícios usando apenas o corpo' },
];

export function StepExerciseTypes({ data, updateData, onNext, onBack, totalSteps }: StepExerciseTypesProps) {
  const canProceed = data.exerciseTypes.length >= 1;

  const toggleExerciseType = (value: string) => {
    const isSelected = data.exerciseTypes.includes(value);
    if (isSelected) {
      updateData('exerciseTypes', data.exerciseTypes.filter((t) => t !== value));
    } else {
      updateData('exerciseTypes', [...data.exerciseTypes, value]);
    }
  };

  return (
    <OnboardingLayout
      step={7}
      totalSteps={totalSteps}
      title="Que tipos de exercícios você prefere?"
      subtitle="Selecione os tipos que você tem acesso ou prefere usar"
      onBack={onBack}
    >
      <div className="space-y-3 mb-4">
        {EXERCISE_TYPE_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.label}
            description={option.desc}
            icon={<Dumbbell className="w-6 h-6" />}
            selected={data.exerciseTypes.includes(option.value)}
            onClick={() => toggleExerciseType(option.value)}
          />
        ))}
      </div>

      <label className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card cursor-pointer mb-6">
        <input
          type="checkbox"
          checked={data.includeCardio}
          onChange={(e) => updateData('includeCardio', e.target.checked)}
          className="w-5 h-5 rounded accent-primary"
        />
        <span className="text-foreground font-medium">Incluir exercícios cardiovasculares</span>
      </label>

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
