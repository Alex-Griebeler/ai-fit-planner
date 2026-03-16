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
  // StepTimeframe, // Removido: modelo low-cost usa 6 meses fixo
  StepTrainingDays,
  StepSessionDuration,
  StepExerciseTypes,
  StepExperience,
  // StepSplitPreference, // Removido: modelo low-cost usa split automático
  // StepVariation, // Removido: modelo low-cost usa variação baixa fixa
  StepBodyAreas,
  StepHealth,
  StepSleepStress,
} from '@/components/onboarding/steps';

// Modelo LOW-COST GYM: 10 steps (removidos Split, Variação e Timeframe)
const TOTAL_STEPS = 10;

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, updateProfile, isUpdating: isUpdatingProfile, isLoading: isLoadingProfile } = useProfile();
  const { onboardingData: savedOnboardingData, isLoading: isLoadingOnboarding, saveOnboardingData, isSaving } = useOnboardingData();
  
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // MODELO LOW-COST: splitPreference e variationPreference são fixos
  // Não precisamos mais calcular shouldShowSplitStep

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
      
      // Nota: onboardingData será limpo pela Result.tsx após consumo bem-sucedido.
      // Se o usuário voltar ao onboarding, os dados serão recarregados do banco.
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
      // MODELO LOW-COST: Step Timeframe removido (usa 6 meses fixo)
      case 4:
        return <StepTrainingDays {...stepProps} />;
      case 5:
        return <StepSessionDuration {...stepProps} />;
      case 6:
        return <StepExerciseTypes {...stepProps} />;
      case 7:
        return <StepExperience {...stepProps} />;
      // MODELO LOW-COST: Steps Split e Variação removidos
      // Variação é sempre 'low' e split é automático
      case 8:
        return <StepBodyAreas {...stepProps} />;
      case 9:
        return <StepHealth {...stepProps} />;
      case 10:
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
