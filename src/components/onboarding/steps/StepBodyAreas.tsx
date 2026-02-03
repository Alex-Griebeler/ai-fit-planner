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
  { value: 'chest', label: 'Peitoral', desc: 'Peito e músculos frontais', icon: Target, isSmall: false },
  { value: 'shoulders', label: 'Ombros', desc: 'Deltoides e trapézio', icon: CircleDot, isSmall: false },
  { value: 'arms', label: 'Braços', desc: 'Bíceps e tríceps', icon: Dumbbell, isSmall: true },
  { value: 'back', label: 'Costas', desc: 'Dorsais e romboides', icon: ArrowLeftRight, isSmall: false },
  { value: 'core', label: 'Core', desc: 'Abdominais e oblíquos', icon: Layers, isSmall: false },
  { value: 'glutes', label: 'Glúteos', desc: 'Glúteo máximo e médio', icon: Circle, isSmall: false },
  { value: 'legs', label: 'Pernas', desc: 'Quadríceps e posteriores', icon: Footprints, isSmall: false },
];

// Grupos pequenos não podem ser priorizados em sessões de 30min
const SMALL_MUSCLE_GROUPS = ['arms', 'biceps', 'triceps'];

export function StepBodyAreas({ data, updateData, onNext, onBack, totalSteps }: StepBodyAreasProps) {
  const isShortSession = data.sessionDuration === '30min';
  const trainingFrequency = data.trainingDays?.length || 0;
  
  // Bloqueia grupos pequenos em 30min APENAS se frequência ≤ 3x/semana
  // Com 4+ dias, mesmo em 30min, há volume semanal suficiente para grupos pequenos
  const shouldBlockSmallGroups = isShortSession && trainingFrequency <= 3;
  
  const availableOptions = shouldBlockSmallGroups
    ? BODY_AREA_OPTIONS.filter(opt => !opt.isSmall)
    : BODY_AREA_OPTIONS;
  const toggleArea = (area: string) => {
    const currentAreas = data.bodyAreas || [];
    const newAreas = currentAreas.includes(area)
      ? currentAreas.filter(a => a !== area)
      : [...currentAreas, area];
    updateData('bodyAreas', newAreas);
  };

  return (
    <OnboardingLayout
      step={8}
      totalSteps={totalSteps}
      title="Em quais áreas do corpo você quer focar?"
      subtitle="Selecione as áreas que você mais quer trabalhar"
      onBack={onBack}
    >
      {shouldBlockSmallGroups && (
        <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg py-2 px-3 mb-4">
          ⚠️ Treinos de 30min com até 3x/semana focam em grandes grupos. Braços recebem trabalho indireto via exercícios compostos.
        </p>
      )}
      
      <div className="space-y-3 mb-4">
        {availableOptions.map((option) => (
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
