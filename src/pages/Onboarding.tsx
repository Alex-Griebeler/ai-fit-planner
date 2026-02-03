import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingData, initialOnboardingData } from '@/types/onboarding';
import { useProfile } from '@/hooks/useProfile';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { useWorkoutPlans } from '@/hooks/useWorkoutPlans';
import { toast } from 'sonner';
import { Loader2, Lock, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  StepBodyAreas,
  StepHealth,
  StepSleepStress,
} from '@/components/onboarding/steps';

const TOTAL_STEPS = 12;

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, updateProfile, isUpdating: isUpdatingProfile, isLoading: isLoadingProfile } = useProfile();
  const { onboardingData: savedOnboardingData, isLoading: isLoadingOnboarding, saveOnboardingData, isSaving } = useOnboardingData();
  const { activePlan, isLoading: isLoadingPlans } = useWorkoutPlans();
  
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Verificar se o plano está ativo e não expirou
  const isPlanLocked = useMemo(() => {
    if (!activePlan?.expires_at) return false;
    return new Date(activePlan.expires_at) > new Date();
  }, [activePlan]);

  const formatExpirationRemaining = (): string => {
    if (!activePlan?.expires_at) return '';
    const now = new Date();
    const expiresAt = new Date(activePlan.expires_at);
    const diff = expiresAt.getTime() - now.getTime();
    if (diff <= 0) return '';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    
    if (weeks > 0 && remainingDays > 0) {
      return `${weeks} semana${weeks > 1 ? 's' : ''} e ${remainingDays} dia${remainingDays > 1 ? 's' : ''}`;
    } else if (weeks > 0) {
      return `${weeks} semana${weeks > 1 ? 's' : ''}`;
    } else {
      return `${days} dia${days > 1 ? 's' : ''}`;
    }
  };

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
        if (!shouldShowSplitStep) {
          return null;
        }
        return <StepSplitPreference {...stepProps} />;
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

  // Estado de loading inicial enquanto busca dados do banco
  if (isLoadingProfile || isLoadingOnboarding || isLoadingPlans) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  // Bloquear se o plano não expirou
  if (isPlanLocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center px-6 max-w-sm"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Plano ativo
          </h1>
          <p className="text-muted-foreground mb-2">
            Seu plano atual foi otimizado para este período de treino.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-primary mb-6">
            <Clock className="w-4 h-4" />
            <span>Próxima atualização em {formatExpirationRemaining()}</span>
          </div>
          <p className="text-xs text-muted-foreground/60 mb-8">
            Para resultados melhores, siga seu plano atual até o fim do ciclo.
          </p>
          <Button
            onClick={() => navigate('/result')}
            className="w-full"
          >
            Ver meu plano atual
          </Button>
        </motion.div>
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
