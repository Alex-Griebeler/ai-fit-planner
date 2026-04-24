import { useState } from 'react';
import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Moon, Zap, Loader2 } from 'lucide-react';

interface StepSleepStressProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onFinish: () => void;
  onBack: () => void;
  totalSteps: number;
  isLoading: boolean;
}

const SLEEP_OPTIONS = [
  { value: 'less5', label: 'Menos de 5h' },
  { value: '5-6', label: '5-6h' },
  { value: '6-7', label: '6-7h' },
  { value: '7-8', label: '7-8h' },
  { value: 'more8', label: 'Mais de 8h' },
];

const STRESS_OPTIONS = [
  { value: 'low', label: 'Baixo', icon: Moon },
  { value: 'moderate', label: 'Moderado', icon: Moon },
  { value: 'high', label: 'Alto', icon: Zap },
] as const;

export function StepSleepStress({ data, updateData, onFinish, onBack, totalSteps, isLoading }: StepSleepStressProps) {
  const [consentAccepted, setConsentAccepted] = useState(false);
  const canProceed = data.sleepHours !== null && data.stressLevel !== null && consentAccepted;

  return (
    <OnboardingLayout
      step={10}
      totalSteps={totalSteps}
      title="Sono e Estresse"
      subtitle="Essas informações nos ajudam a ajustar a intensidade dos treinos"
      onBack={onBack}
    >
      <div className="space-y-6 mb-6">
        <div>
          <label className="text-sm text-muted-foreground mb-3 block">
            Quantas horas você dorme por noite?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SLEEP_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={data.sleepHours === option.value ? 'default' : 'outline'}
                onClick={() => updateData('sleepHours', option.value)}
                className="h-11"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-3 block">
            Qual seu nível de estresse no dia a dia?
          </label>
          <div className="space-y-2">
            {STRESS_OPTIONS.map((option) => (
              <OptionCard
                key={option.value}
                title={option.label}
                icon={<option.icon className="w-5 h-5" />}
                selected={data.stressLevel === option.value}
                onClick={() => updateData('stressLevel', option.value)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="health-consent"
              checked={consentAccepted}
              onCheckedChange={(checked) => setConsentAccepted(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="health-consent" className="cursor-pointer leading-relaxed">
              Confirmo que as informações fornecidas são verdadeiras e que interromperei o exercício se houver dor aguda, tontura ou mal-estar.
            </Label>
          </div>
          {!consentAccepted && (
            <p className="text-xs text-destructive">
              É necessário aceitar o termo para finalizar o questionário.
            </p>
          )}
        </div>
      </div>

      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        onClick={onFinish}
        disabled={!canProceed || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Salvando...
          </>
        ) : (
          'Finalizar Questionário'
        )}
      </Button>
    </OnboardingLayout>
  );
}
