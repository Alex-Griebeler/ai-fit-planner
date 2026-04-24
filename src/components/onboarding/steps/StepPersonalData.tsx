import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  calculateAgeFromBirthDate,
  getBirthDateBounds,
  isAgeInAllowedRange,
  MAX_ALLOWED_AGE,
  MIN_ALLOWED_AGE,
} from '@/lib/profileAge';

interface StepPersonalDataProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

export function StepPersonalData({ data, updateData, onNext, onBack, totalSteps }: StepPersonalDataProps) {
  const MIN_HEIGHT = 100;
  const MAX_HEIGHT = 250;
  const MIN_WEIGHT = 30;
  const MAX_WEIGHT = 300;
  const birthDateBounds = getBirthDateBounds();
  const computedAge = calculateAgeFromBirthDate(data.birthDate);
  const ageIsValid = isAgeInAllowedRange(computedAge);
  const heightIsValid = data.height !== null && data.height >= MIN_HEIGHT && data.height <= MAX_HEIGHT;
  const weightIsValid = data.weight !== null && data.weight >= MIN_WEIGHT && data.weight <= MAX_WEIGHT;
  const canProceed = data.gender !== null && data.birthDate !== null && ageIsValid && heightIsValid && weightIsValid;

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Data de nascimento</label>
            <Input
              type="date"
              min={birthDateBounds.min}
              max={birthDateBounds.max}
              value={data.birthDate || ''}
              onChange={(e) => {
                const birthDate = e.target.value || null;
                const age = calculateAgeFromBirthDate(birthDate);
                updateData('birthDate', birthDate);
                updateData('age', age);
              }}
            />
            {data.birthDate && !ageIsValid && (
              <p className="text-xs text-destructive mt-1">
                Data inválida. A idade deve estar entre {MIN_ALLOWED_AGE} e {MAX_ALLOWED_AGE} anos
              </p>
            )}
            {computedAge !== null && ageIsValid && (
              <p className="text-xs text-muted-foreground mt-1">Idade calculada: {computedAge} anos</p>
            )}
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Altura (cm)</label>
            <Input
              type="number"
              placeholder="170"
              min={MIN_HEIGHT}
              max={MAX_HEIGHT}
              value={data.height || ''}
              onChange={(e) => updateData('height', parseInt(e.target.value) || null)}
            />
            {data.height !== null && (data.height < MIN_HEIGHT || data.height > MAX_HEIGHT) && (
              <p className="text-xs text-destructive mt-1">Altura deve estar entre {MIN_HEIGHT} e {MAX_HEIGHT} cm</p>
            )}
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Peso (kg)</label>
            <Input
              type="number"
              step="0.1"
              min={MIN_WEIGHT}
              max={MAX_WEIGHT}
              placeholder="70"
              value={data.weight || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateData('weight', Number.isNaN(val) ? null : val);
              }}
            />
            {data.weight !== null && (data.weight < MIN_WEIGHT || data.weight > MAX_WEIGHT) && (
              <p className="text-xs text-destructive mt-1">Peso deve estar entre {MIN_WEIGHT} e {MAX_WEIGHT} kg</p>
            )}
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
