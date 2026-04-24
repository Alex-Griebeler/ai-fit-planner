import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Heart, Zap } from 'lucide-react';

interface StepGoalProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

type GoalValue = NonNullable<OnboardingData['goal']>;

const GOAL_OPTIONS: { value: GoalValue; title: string; description: string; icon: typeof Target }[] = [
  { value: 'weight_loss', title: 'Emagrecimento', description: 'Perder peso e definir o corpo', icon: Target },
  { value: 'hypertrophy', title: 'Hipertrofia', description: 'Ganhar massa muscular', icon: TrendingUp },
  { value: 'health', title: 'Saúde e bem-estar', description: 'Melhorar saúde geral', icon: Heart },
  { value: 'performance', title: 'Performance física', description: 'Melhorar desempenho atlético', icon: Zap },
];

export function StepGoal({ data, updateData, onNext, onBack, totalSteps }: StepGoalProps) {
  // First selected entry = primary goal (persisted as `goal`).
  // Second entry = optional secondary goal (kept in OnboardingData; injected
  // into the AI prompt as additional context, not persisted as a DB column).
  const selected: GoalValue[] = [
    ...(data.goal ? [data.goal] : []),
    ...(data.secondaryGoal ? [data.secondaryGoal] : []),
  ];

  const isSelected = (value: GoalValue) => selected.includes(value);
  const selectionCount = selected.length;
  const canProceed = selectionCount >= 1 && selectionCount <= 2;

  const toggleGoal = (value: GoalValue) => {
    if (isSelected(value)) {
      const next = selected.filter((g) => g !== value);
      updateData('goal', (next[0] ?? null) as OnboardingData['goal']);
      updateData('secondaryGoal', (next[1] ?? null) as OnboardingData['secondaryGoal']);
      return;
    }
    if (selectionCount >= 2) return;
    if (selectionCount === 0) {
      updateData('goal', value);
    } else {
      updateData('secondaryGoal', value);
    }
  };

  return (
    <OnboardingLayout
      step={3}
      totalSteps={totalSteps}
      title="Quais são seus objetivos?"
      subtitle="Selecione 1 ou 2 objetivos. O primeiro será o foco principal."
      onBack={onBack}
    >
      <div className="space-y-3 mb-3">
        {GOAL_OPTIONS.map((option) => {
          const sel = isSelected(option.value);
          const order = sel ? selected.indexOf(option.value) + 1 : null;
          return (
            <div key={option.value} className="relative">
              <OptionCard
                title={option.title}
                description={option.description}
                icon={<option.icon className="w-6 h-6" />}
                selected={sel}
                onClick={() => toggleGoal(option.value)}
              />
              {order !== null && (
                <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                  {order === 1 ? 'PRINCIPAL' : 'SECUNDÁRIO'}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mb-6 text-center">
        {selectionCount === 0 && 'Selecione pelo menos 1 objetivo'}
        {selectionCount === 1 && 'Você pode adicionar mais 1 objetivo (opcional)'}
        {selectionCount === 2 && 'Máximo atingido. Toque novamente para remover.'}
      </p>
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
