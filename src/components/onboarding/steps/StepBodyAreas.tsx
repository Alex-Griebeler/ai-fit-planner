import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { Target, CircleDot, Dumbbell, ArrowLeftRight, Layers, Circle, Footprints } from 'lucide-react';

interface StepBodyAreasProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

const BODY_AREA_OPTIONS = [
  { value: 'chest', label: 'Peitoral', desc: 'Peito e músculos frontais', icon: Target },
  { value: 'shoulders', label: 'Ombros', desc: 'Deltoides e trapézio', icon: CircleDot },
  { value: 'arms', label: 'Braços', desc: 'Bíceps e tríceps', icon: Dumbbell },
  { value: 'back', label: 'Costas', desc: 'Dorsais e romboides', icon: ArrowLeftRight },
  { value: 'core', label: 'Core', desc: 'Abdominais e oblíquos', icon: Layers },
  { value: 'glutes', label: 'Glúteos', desc: 'Glúteo máximo e médio', icon: Circle },
  { value: 'legs', label: 'Pernas', desc: 'Quadríceps e posteriores', icon: Footprints },
];

export function StepBodyAreas({ data, updateData, onNext, onBack, totalSteps }: StepBodyAreasProps) {
  const toggleArea = (area: string) => {
    const currentAreas = data.bodyAreas || [];
    const newAreas = currentAreas.includes(area)
      ? currentAreas.filter(a => a !== area)
      : [...currentAreas, area];
    updateData('bodyAreas', newAreas);
  };

  return (
    <OnboardingLayout
      step={10}
      totalSteps={totalSteps}
      title="Em quais áreas do corpo você quer focar?"
      subtitle="Selecione as áreas que você mais quer trabalhar"
      onBack={onBack}
    >
      <div className="space-y-3 mb-4">
        {BODY_AREA_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            title={option.label}
            description={option.desc}
            icon={<option.icon className="w-6 h-6" />}
            selected={(data.bodyAreas || []).includes(option.value)}
            onClick={() => toggleArea(option.value)}
          />
        ))}
      </div>

      {(data.bodyAreas || []).length === 0 && (
        <p className="text-center text-sm text-muted-foreground bg-secondary/50 rounded-lg py-3 mb-4">
          Nenhuma área selecionada = distribuição equilibrada
        </p>
      )}

      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        onClick={onNext}
      >
        Continuar
      </Button>
    </OnboardingLayout>
  );
}
