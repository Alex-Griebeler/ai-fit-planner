import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Heart, Zap } from 'lucide-react';
import { goalsFromLegacy, normalizeGoals, MAX_GOALS_ALLOWED } from '@/lib/goals';

interface StepGoalProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

const GOAL_OPTIONS = [
  { value: 'weight_loss', title: 'Emagrecimento', description: 'Perder peso e definir o corpo', icon: Target },
  { value: 'hypertrophy', title: 'Hipertrofia', description: 'Ganhar massa muscular', icon: TrendingUp },
  { value: 'health', title: 'Saúde e bem-estar', description: 'Melhorar saúde geral', icon: Heart },
  { value: 'performance', title: 'Performance física', description: 'Melhorar desempenho atlético', icon: Zap },
] as const;

export function StepGoal({ data, updateData, onNext, onBack, totalSteps }: StepGoalProps) {
  const selectedGoals = goalsFromLegacy(data.goal, data.goals);
  const canProceed = selectedGoals.length >= 1 && selectedGoals.length <= MAX_GOALS_ALLOWED;

  const toggleGoal = (goal: OnboardingData['goal']) => {
    if (!goal) return;
    const current = normalizeGoals(data.goals);
    const exists = current.includes(goal);
    if (!exists && current.length >= MAX_GOALS_ALLOWED) return;
    const nextGoals = exists
      ? current.filter((item) => item !== goal)
      : [...current, goal];

    updateData('goals', nextGoals);
    updateData('goal', nextGoals[0] ?? null);
  };

  return (
    <OnboardingLayout
      step={3}
      totalSteps={totalSteps}
      title="Quais são seus objetivos principais?"
      subtitle="Selecione 1 ou 2 objetivos para personalizar sua prescrição"
      onBack={onBack}
    >
      <div className="space-y-3 mb-6">
        {GOAL_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.title}
            description={option.description}
            icon={<option.icon className="w-6 h-6" />}
            selected={selectedGoals.includes(option.value)}
            disabled={!selectedGoals.includes(option.value) && selectedGoals.length >= MAX_GOALS_ALLOWED}
            onClick={() => toggleGoal(option.value)}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Selecionados: {selectedGoals.length}/{MAX_GOALS_ALLOWED}.
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
