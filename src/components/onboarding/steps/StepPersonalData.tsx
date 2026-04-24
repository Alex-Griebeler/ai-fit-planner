import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  calculateAge,
  MIN_AGE_YEARS,
  MAX_AGE_YEARS,
  MIN_BIRTH_DATE,
} from '@/lib/age';

interface StepPersonalDataProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

const minBirthDate = new Date(MIN_BIRTH_DATE);

export function StepPersonalData({ data, updateData, onNext, onBack, totalSteps }: StepPersonalDataProps) {
  // birthDate is the source of truth. `age` is kept derived for backward
  // compatibility with downstream consumers (Profile, Result, generate-workout).
  const derivedAge = calculateAge(data.birthDate);

  useEffect(() => {
    if (derivedAge !== null && derivedAge !== data.age) {
      updateData('age', derivedAge);
    }
  }, [derivedAge, data.age, updateData]);

  const [open, setOpen] = useState(false);

  const effectiveAge = derivedAge ?? data.age ?? null;
  const ageIsValid = effectiveAge !== null && effectiveAge >= MIN_AGE_YEARS && effectiveAge <= MAX_AGE_YEARS;
  const canProceed =
    data.gender !== null && data.birthDate !== null && ageIsValid && data.height !== null && data.weight !== null;

  const today = new Date();
  const selectedDate = data.birthDate ? parseISO(data.birthDate) : undefined;
  const defaultMonth = selectedDate ?? new Date(today.getFullYear() - 25, today.getMonth(), 1);

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

        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Data de nascimento</label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-11',
                  !data.birthDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Selecione sua data de nascimento'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (!date) return;
                  const iso = format(date, 'yyyy-MM-dd');
                  updateData('birthDate', iso);
                  updateData('age', calculateAge(iso));
                  setOpen(false);
                }}
                disabled={(date) => date > today || date < minBirthDate}
                defaultMonth={defaultMonth}
                fromYear={1900}
                toYear={today.getFullYear()}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
          {effectiveAge !== null && (
            <p className="text-xs text-muted-foreground mt-1">
              Idade calculada: <span className="text-foreground font-medium">{effectiveAge} anos</span>
            </p>
          )}
          {effectiveAge !== null && effectiveAge < MIN_AGE_YEARS && (
            <p className="text-xs text-destructive mt-1">Idade mínima: {MIN_AGE_YEARS} anos</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
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
