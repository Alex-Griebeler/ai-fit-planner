import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingData, INJURY_AREA_OPTIONS, InjuryArea } from '@/types/onboarding';
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

const MIN_HEALTH_DESCRIPTION_LENGTH = 15;

export function StepHealth({ data, updateData, onNext, onBack, totalSteps }: StepHealthProps) {
  const handleConditionChange = (hasCondition: boolean) => {
    updateData('hasHealthConditions', hasCondition);
    if (!hasCondition) {
      updateData('injuryAreas', []);
      updateData('healthDescription', '');
    }
  };

  const handleInjuryAreaToggle = (areaKey: InjuryArea) => {
    const currentAreas = data.injuryAreas || [];
    const isSelected = currentAreas.includes(areaKey);
    
    if (isSelected) {
      updateData('injuryAreas', currentAreas.filter(a => a !== areaKey));
    } else {
      updateData('injuryAreas', [...currentAreas, areaKey]);
    }
  };

  const selectedAreasCount = (data.injuryAreas || []).length;
  const trimmedDescription = data.healthDescription.trim();
  const missingInjuryArea = data.hasHealthConditions && selectedAreasCount === 0;
  const missingHealthDescription = data.hasHealthConditions && trimmedDescription.length < MIN_HEALTH_DESCRIPTION_LENGTH;
  const canProceed = !missingInjuryArea && !missingHealthDescription;

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
                          flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                          ${isSelected 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border bg-card hover:border-primary/50'
                          }
                        `}
                      >
                        <Checkbox
                          checked={isSelected}
                          onClick={(event) => event.stopPropagation()}
                          onCheckedChange={() => handleInjuryAreaToggle(area.key)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {area.label}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {area.description}
                          </p>
                        </div>
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

              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Descrição da condição/lesão <span className="text-destructive">*</span>
                </p>
                <Textarea
                  placeholder="Descreva sintomas, limitações e cuidados (mínimo de 15 caracteres)..."
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
                    {trimmedDescription.length}/500
                  </p>
                </div>
                {missingHealthDescription && (
                  <p className="text-xs text-destructive mt-2">
                    Descreva sua condição com pelo menos {MIN_HEALTH_DESCRIPTION_LENGTH} caracteres.
                  </p>
                )}
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
