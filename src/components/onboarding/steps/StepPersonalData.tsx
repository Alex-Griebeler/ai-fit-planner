import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface StepPersonalDataProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

export function StepPersonalData({ data, updateData, onNext, onBack, totalSteps }: StepPersonalDataProps) {
  const canProceed = data.gender !== null && data.age !== null && data.height !== null && data.weight !== null;

  return (
    <OnboardingLayout
      step={2}
      totalSteps={totalSteps}
      title={`${data.name}, seus dados estão corretos?`}
      subtitle="Precisamos dessas informações para personalizar seus treinos"
      onBack={onBack}
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Gênero</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'female', label: 'Feminino' },
              { value: 'male', label: 'Masculino' },
              { value: 'other', label: 'Outro' },
            ].map((option) => (
              <Button
                key={option.value}
                variant={data.gender === option.value ? 'default' : 'outline'}
                onClick={() => updateData('gender', option.value as OnboardingData['gender'])}
                className="h-11"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Idade</label>
            <Input
              type="number"
              placeholder="25"
              value={data.age || ''}
              onChange={(e) => updateData('age', parseInt(e.target.value) || null)}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Altura (cm)</label>
            <Input
              type="number"
              placeholder="170"
              value={data.height || ''}
              onChange={(e) => updateData('height', parseInt(e.target.value) || null)}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Peso (kg)</label>
            <Input
              type="number"
              placeholder="70"
              value={data.weight || ''}
              onChange={(e) => updateData('weight', parseInt(e.target.value) || null)}
            />
          </div>
        </div>

        <Button
          variant="gradient"
          size="lg"
          className="w-full mt-4"
          onClick={onNext}
          disabled={!canProceed}
        >
          Continuar
        </Button>
      </div>
    </OnboardingLayout>
  );
}
