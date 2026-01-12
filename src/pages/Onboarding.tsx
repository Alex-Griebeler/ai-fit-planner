import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingData, initialOnboardingData } from '@/types/onboarding';
import { useProfile } from '@/hooks/useProfile';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { toast } from 'sonner';
import {
  StepName,
  StepPersonalData,
  StepGoal,
  StepTimeframe,
  StepTrainingDays,
  StepSessionDuration,
  StepExerciseTypes,
  StepExperience,
  StepVariation,
  StepBodyAreas,
  StepHealth,
  StepSleepStress,
} from '@/components/onboarding/steps';

const TOTAL_STEPS = 12;

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, updateProfile, isUpdating: isUpdatingProfile } = useProfile();
  const { saveOnboardingData, isSaving } = useOnboardingData();
  
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preenche nome do perfil se existir
  useEffect(() => {
    if (profile?.name && !data.name) {
      setData(prev => ({ ...prev, name: profile.name }));
    }
  }, [profile]);

  const updateData = <K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    
    try {
      // Salva perfil com dados biométricos
      await updateProfile({
        name: data.name,
        gender: data.gender,
        age: data.age,
        height: data.height,
        weight: data.weight,
      });

      // Salva preferências de treino
      await saveOnboardingData(data);

      // Salva no sessionStorage temporariamente para a página de resultado
      sessionStorage.setItem('onboardingData', JSON.stringify(data));
      
      toast.success('Dados salvos com sucesso!');
      navigate('/result');
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      toast.error('Erro ao salvar dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const isLoading = isSubmitting || isUpdatingProfile || isSaving;

  const stepProps = {
    data,
    updateData,
    onNext: nextStep,
    onBack: prevStep,
    totalSteps: TOTAL_STEPS,
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepName {...stepProps} />;
      case 2:
        return <StepPersonalData {...stepProps} />;
      case 3:
        return <StepGoal {...stepProps} />;
      case 4:
        return <StepTimeframe {...stepProps} />;
      case 5:
        return <StepTrainingDays {...stepProps} />;
      case 6:
        return <StepSessionDuration {...stepProps} />;
      case 7:
        return <StepExerciseTypes {...stepProps} />;
      case 8:
        return <StepExperience {...stepProps} />;
      case 9:
        return <StepVariation {...stepProps} />;
      case 10:
        return <StepBodyAreas {...stepProps} />;
      case 11:
        return <StepHealth {...stepProps} />;
      case 12:
        return <StepSleepStress {...stepProps} onFinish={handleFinish} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {renderStep()}
      </motion.div>
    </AnimatePresence>
  );
}
