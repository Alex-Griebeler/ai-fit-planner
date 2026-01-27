import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingData, initialOnboardingData } from '@/types/onboarding';
import { useProfile } from '@/hooks/useProfile';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  StepName,
  StepPersonalData,
  StepGoal,
  StepTimeframe,
  StepTrainingDays,
  StepSessionDuration,
  StepExerciseTypes,
  StepExperience,
  StepSplitPreference,
  StepVariation,
  StepBodyAreas,
  StepHealth,
  StepSleepStress,
} from '@/components/onboarding/steps';

const TOTAL_STEPS = 13;

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, updateProfile, isUpdating: isUpdatingProfile, isLoading: isLoadingProfile } = useProfile();
  const { onboardingData: savedOnboardingData, isLoading: isLoadingOnboarding, saveOnboardingData, isSaving } = useOnboardingData();
  
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Compute if split step should be shown (for step 9)
  const shouldShowSplitStep = useMemo(() => 
    data.experienceLevel !== 'beginner' && data.trainingDays.length === 3,
    [data.experienceLevel, data.trainingDays.length]
  );

  // Skip step 9 automatically if conditions not met
  useEffect(() => {
    if (step === 9 && !shouldShowSplitStep) {
      setStep(10);
    }
  }, [step, shouldShowSplitStep]);

  // Preenche dados do perfil e onboarding salvos
  useEffect(() => {
    if (isLoadingProfile || isLoadingOnboarding || hasInitialized) return;

    // Mescla dados salvos com valores iniciais
    const mergedData: OnboardingData = {
      ...initialOnboardingData,
      // Dados do onboarding salvos
      ...(savedOnboardingData || {}),
      // Dados do perfil (sobrescrevem)
      name: profile?.name || savedOnboardingData?.name || '',
      gender: profile?.gender as OnboardingData['gender'] || null,
      age: profile?.age || null,
      height: profile?.height || null,
      weight: profile?.weight || null,
    };

    setData(mergedData);
    setHasInitialized(true);
  }, [profile, savedOnboardingData, isLoadingProfile, isLoadingOnboarding, hasInitialized]);

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

      // Sanitiza trainingDays antes de salvar (remove duplicatas e valida dias)
      const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      const sanitizedData = {
        ...data,
        trainingDays: [...new Set(data.trainingDays)].filter(d => validDays.includes(d)),
      };

      // Salva preferências de treino
      await saveOnboardingData(sanitizedData);

      // Salva no sessionStorage temporariamente para a página de resultado
      sessionStorage.setItem('onboardingData', JSON.stringify(sanitizedData));
      
      toast.success('Dados salvos com sucesso!');
      navigate('/result');
    } catch (error) {
      // Log error without sensitive details
      console.error('Error saving onboarding data');
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
        // Will be skipped by useEffect if conditions not met
        // Show loader briefly while transitioning to prevent null flash
        if (!shouldShowSplitStep) {
          return (
            <div className="min-h-screen bg-background flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          );
        }
        return <StepSplitPreference {...stepProps} />;
      case 10:
        return <StepVariation {...stepProps} />;
      case 11:
        return <StepBodyAreas {...stepProps} />;
      case 12:
        return <StepHealth {...stepProps} />;
      case 13:
        return <StepSleepStress {...stepProps} onFinish={handleFinish} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  // Estado de loading inicial enquanto busca dados do banco
  if (isLoadingProfile || isLoadingOnboarding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

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
