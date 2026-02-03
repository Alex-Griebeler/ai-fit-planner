import { OnboardingData, CardioTiming } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { Dumbbell, Heart } from 'lucide-react';

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

const CARDIO_TIMING_OPTIONS = [
  { 
    value: 'post_workout' as CardioTiming, 
    label: 'Após o treino de força', 
    desc: 'Adiciona ~15-20min à sessão' 
  },
  { 
    value: 'separate_day' as CardioTiming, 
    label: 'Em dias separados', 
    desc: 'Cardio em dias sem treino de força' 
  },
  { 
    value: 'ai_decides' as CardioTiming, 
    label: 'Deixar a IA decidir', 
    desc: 'Baseado no seu objetivo e disponibilidade' 
  },
];

export function StepExerciseTypes({ data, updateData, onNext, onBack, totalSteps }: StepExerciseTypesProps) {
  const canProceed = data.exerciseTypes.length >= 1 && 
    (!data.includeCardio || data.cardioTiming !== null);

  const toggleExerciseType = (value: string) => {
    const isSelected = data.exerciseTypes.includes(value);
    if (isSelected) {
      updateData('exerciseTypes', data.exerciseTypes.filter((t) => t !== value));
    } else {
      updateData('exerciseTypes', [...data.exerciseTypes, value]);
    }
  };

  const handleCardioChange = (checked: boolean) => {
    updateData('includeCardio', checked);
    if (!checked) {
      updateData('cardioTiming', null);
    }
  };

  return (
    <OnboardingLayout
      step={6}
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

      <label className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={data.includeCardio}
          onChange={(e) => handleCardioChange(e.target.checked)}
          className="w-5 h-5 rounded accent-primary"
        />
        <span className="text-foreground font-medium">Incluir exercícios cardiovasculares</span>
      </label>

      {data.includeCardio && (
        <div className="space-y-3 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm text-muted-foreground font-medium">
            Como você prefere fazer o cardio? <span className="text-destructive">*</span>
          </p>
          {CARDIO_TIMING_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              title={option.label}
              description={option.desc}
              icon={<Heart className="w-6 h-6" />}
              selected={data.cardioTiming === option.value}
              onClick={() => updateData('cardioTiming', option.value)}
            />
          ))}
          {data.cardioTiming === null && (
            <p className="text-xs text-destructive mt-2">
              Selecione uma opção para continuar
            </p>
          )}
        </div>
      )}

      {!data.includeCardio && <div className="mb-6" />}

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
