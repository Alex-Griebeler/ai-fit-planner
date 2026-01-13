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

  return (
    <OnboardingLayout
      step={11}
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
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Detalhes adicionais (opcional):
                </p>
                <Textarea
                  placeholder="Descreva brevemente para que possamos adaptar seus treinos com segurança..."
                  value={data.healthDescription}
                  onChange={(e) => updateData('healthDescription', e.target.value)}
                  className="min-h-[80px]"
                />
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
        >
          Continuar
        </Button>
      </div>
    </OnboardingLayout>
  );
}
