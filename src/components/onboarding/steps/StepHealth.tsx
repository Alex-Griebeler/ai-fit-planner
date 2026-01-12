import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '../OnboardingLayout';
import { OptionCard } from '../OptionCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Heart } from 'lucide-react';

interface StepHealthProps {
  data: OnboardingData;
  updateData: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  totalSteps: number;
}

export function StepHealth({ data, updateData, onNext, onBack, totalSteps }: StepHealthProps) {
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
          onClick={() => {
            updateData('hasHealthConditions', false);
            updateData('healthDescription', '');
          }}
        />
        <OptionCard
          title="Sim"
          description="Tenho condições que precisam ser consideradas"
          icon={<Heart className="w-6 h-6" />}
          selected={data.hasHealthConditions}
          onClick={() => updateData('hasHealthConditions', true)}
        />
      </div>

      <AnimatePresence>
        {data.hasHealthConditions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Textarea
              placeholder="Descreva brevemente para que possamos adaptar seus treinos com segurança..."
              value={data.healthDescription}
              onChange={(e) => updateData('healthDescription', e.target.value)}
              className="min-h-[100px] mb-4"
            />
          </motion.div>
        )}
      </AnimatePresence>

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
