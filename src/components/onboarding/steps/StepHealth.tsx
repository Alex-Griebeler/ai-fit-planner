import { motion, AnimatePresence } from 'framer-motion';
import {
  OnboardingData,
  INJURY_AREA_OPTIONS,
  INJURY_SIDE_OPTIONS,
  INJURY_SEVERITY_OPTIONS,
  INJURY_DURATION_OPTIONS,
  SIDE_RELEVANT_INJURIES,
  InjuryArea,
  InjuryDetail,
  InjuryDetails,
} from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Heart } from 'lucide-react';

interface StepHealthProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

function getAreaLabel(areaKey: InjuryArea): string {
  return INJURY_AREA_OPTIONS.find((a) => a.key === areaKey)?.label ?? areaKey;
}

export function StepHealth({ data, updateData, onNext, onBack, totalSteps }: StepHealthProps) {
  const injuryDetails: InjuryDetails = data.injuryDetails ?? {};

  const handleConditionChange = (hasCondition: boolean) => {
    updateData('hasHealthConditions', hasCondition);
    if (!hasCondition) {
      updateData('injuryAreas', []);
      updateData('injuryDetails', {});
      updateData('healthDescription', '');
    }
  };

  const handleInjuryAreaToggle = (areaKey: InjuryArea) => {
    const currentAreas = data.injuryAreas || [];
    const isSelected = currentAreas.includes(areaKey);

    if (isSelected) {
      updateData('injuryAreas', currentAreas.filter((a) => a !== areaKey));
      const nextDetails = { ...injuryDetails };
      delete nextDetails[areaKey];
      updateData('injuryDetails', nextDetails);
    } else {
      updateData('injuryAreas', [...currentAreas, areaKey]);
    }
  };

  const updateDetail = <K extends keyof InjuryDetail>(
    areaKey: InjuryArea,
    field: K,
    value: InjuryDetail[K],
  ) => {
    const current = injuryDetails[areaKey] ?? {};
    updateData('injuryDetails', {
      ...injuryDetails,
      [areaKey]: { ...current, [field]: value },
    });
  };

  const selectedAreasCount = (data.injuryAreas || []).length;
  const missingInjuryArea = data.hasHealthConditions && selectedAreasCount === 0;
  const canProceed = !missingInjuryArea;

  return (
    <OnboardingLayout
      step={9}
      totalSteps={totalSteps}
      title="Você tem alguma lesão ou condição médica?"
      subtitle="Isso nos ajuda a adaptar os exercícios para sua segurança"
      onBack={onBack}
    >
      <div className="space-y-3 mb-4">
        <OptionCard
          title="Não"
          description="Não tenho lesões ou limitações físicas"
          icon={<CheckCircle className="w-6 h-6" />}
          selected={!data.hasHealthConditions}
          onClick={() => handleConditionChange(false)}
        />
        <OptionCard
          title="Sim"
          description="Tenho condições que precisam ser consideradas"
          icon={<Heart className="w-6 h-6" />}
          selected={data.hasHealthConditions}
          onClick={() => handleConditionChange(true)}
        />
      </div>

      <AnimatePresence>
        {data.hasHealthConditions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-sm font-medium text-foreground mb-3">
                  Selecione as regiões afetadas:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {INJURY_AREA_OPTIONS.map((area) => {
                    const isSelected = (data.injuryAreas || []).includes(area.key);
                    return (
                      <div
                        key={area.key}
                        onClick={() => handleInjuryAreaToggle(area.key)}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                          ${isSelected
                            ? 'border-destructive bg-destructive/15 shadow-[0_0_0_1px_hsl(var(--destructive)/0.25)] hover:bg-destructive/20'
                            : 'border-border bg-card hover:border-destructive/40 hover:bg-destructive/5'
                          }
                        `}
                      >
                        <Checkbox
                          checked={isSelected}
                          onClick={(event) => event.stopPropagation()}
                          onCheckedChange={() => handleInjuryAreaToggle(area.key)}
                          className={`h-5 w-5 rounded-full border-2 ${isSelected ? 'border-destructive bg-destructive text-destructive-foreground data-[state=checked]:border-destructive data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground' : 'border-muted-foreground/40'}`}
                        />
                        <p className="text-sm font-medium flex-1 min-w-0 text-foreground">
                          <span className={`inline-flex max-w-full rounded-full px-2 py-0.5 transition-colors ${isSelected ? 'bg-destructive text-destructive-foreground' : 'bg-transparent'}`}>
                          {area.label}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
                {missingInjuryArea && (
                  <p className="text-xs text-destructive mt-2">
                    Selecione ao menos uma região para continuarmos com segurança.
                  </p>
                )}
              </div>

              {(data.injuryAreas || []).length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Preenchendo os detalhes abaixo a prescrição fica mais precisa. Campos são opcionais.
                  </p>
                  {(data.injuryAreas || []).map((areaKey) => {
                    const detail = injuryDetails[areaKey] ?? {};
                    const sideApplies = SIDE_RELEVANT_INJURIES.includes(areaKey);
                    return (
                      <div
                        key={areaKey}
                        className="rounded-lg border border-destructive bg-destructive/15 shadow-[0_0_0_1px_hsl(var(--destructive)/0.25)] p-3 space-y-3"
                      >
                        <p className="text-sm font-semibold">
                          <span className="inline-flex max-w-full rounded-full bg-destructive text-destructive-foreground px-2 py-0.5">
                            {getAreaLabel(areaKey)}
                          </span>
                        </p>
                        {sideApplies && (
                          <ChipRow
                            label="Lado"
                            options={INJURY_SIDE_OPTIONS}
                            value={detail.side}
                            onChange={(v) => updateDetail(areaKey, 'side', v)}
                          />
                        )}
                        <ChipRow
                          label="Intensidade"
                          options={INJURY_SEVERITY_OPTIONS}
                          value={detail.severity}
                          onChange={(v) => updateDetail(areaKey, 'severity', v)}
                        />
                        <ChipRow
                          label="Há quanto tempo"
                          options={INJURY_DURATION_OPTIONS}
                          value={detail.duration}
                          onChange={(v) => updateDetail(areaKey, 'duration', v)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Descrição da condição/lesão
                  <span className="text-xs font-normal text-muted-foreground ml-2">(opcional)</span>
                </p>
                <Textarea
                  placeholder="Ex.: dor no ombro direito há 3 meses, piora ao elevar o braço acima da cabeça."
                  value={data.healthDescription}
                  onChange={(e) => updateData('healthDescription', e.target.value)}
                  className="min-h-[80px]"
                  maxLength={500}
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Quanto mais claro, mais segura fica a prescrição.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.healthDescription.trim().length}/500
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6">
        <Button
          variant="gradient"
          size="lg"
          className="w-full"
          onClick={onNext}
          disabled={!canProceed}
        >
          Continuar
        </Button>
      </div>
    </OnboardingLayout>
  );
}

interface ChipRowProps<V extends string> {
  label: string;
  options: { value: V; label: string }[];
  value: V | undefined;
  onChange: (value: V) => void;
}

function ChipRow<V extends string>({ label, options, value, onChange }: ChipRowProps<V>) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-all ${
                selected
                  ? 'border-destructive bg-destructive text-destructive-foreground shadow-[0_0_0_1px_hsl(var(--destructive)/0.25)]'
                  : 'border-border text-muted-foreground hover:border-destructive/50 hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
