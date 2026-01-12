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

const GOAL_OPTIONS = [
  { value: 'weight_loss', title: 'Emagrecimento', description: 'Perder peso e definir o corpo', icon: Target },
  { value: 'hypertrophy', title: 'Hipertrofia', description: 'Ganhar massa muscular', icon: TrendingUp },
  { value: 'health', title: 'Saúde e bem-estar', description: 'Melhorar saúde geral', icon: Heart },
  { value: 'performance', title: 'Performance física', description: 'Melhorar desempenho atlético', icon: Zap },
] as const;

export function StepGoal({ data, updateData, onNext, onBack, totalSteps }: StepGoalProps) {
  const canProceed = data.goal !== null;

  return (
    <OnboardingLayout
      step={3}
      totalSteps={totalSteps}
      title="Qual é seu objetivo principal?"
      subtitle="Selecione o objetivo que mais se identifica com você"
      onBack={onBack}
    >
      <div className="space-y-3 mb-6">
        {GOAL_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.title}
            description={option.description}
            icon={<option.icon className="w-6 h-6" />}
            selected={data.goal === option.value}
            onClick={() => updateData('goal', option.value)}
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
