import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingData, initialOnboardingData } from '@/types/onboarding';
import { useProfile } from '@/hooks/useProfile';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { normalizeTrainingDays } from '@/lib/trainingDays';
import { goalsFromLegacy, normalizeGoals, primaryGoalFromGoals, MAX_GOALS_ALLOWED } from '@/lib/goals';
import { calculateAgeFromBirthDate, isAgeInAllowedRange } from '@/lib/profileAge';
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
const MIN_GOALS_REQUIRED = 1;

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, updateProfile, isUpdating: isUpdatingProfile, isLoading: isLoadingProfile } = useProfile();
  const { onboardingData: savedOnboardingData, isLoading: isLoadingOnboarding, saveOnboardingData, isSaving } = useOnboardingData();
  
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Limpa dados temporários antigos ao iniciar novo fluxo de onboarding
  // Evita contaminação de dados obsoletos de jornadas anteriores
  useEffect(() => {
    sessionStorage.removeItem('onboardingData');
  }, []);

  // MODELO LOW-COST: splitPreference e variationPreference são fixos
  // Não precisamos mais calcular shouldShowSplitStep

  // Preenche dados do perfil e onboarding salvos
  useEffect(() => {
    if (isLoadingProfile || isLoadingOnboarding || hasInitialized) return;

    // Mescla dados salvos com valores iniciais
    const profileBirthDate = profile?.birth_date ?? null;
    const ageFromBirthDate = calculateAgeFromBirthDate(profileBirthDate);
    const mergedData: OnboardingData = {
      ...initialOnboardingData,
      // Dados do onboarding salvos
      ...(savedOnboardingData || {}),
      // Dados do perfil (sobrescrevem)
      name: profile?.name || savedOnboardingData?.name || '',
      gender: profile?.gender as OnboardingData['gender'] || null,
      birthDate: profileBirthDate || savedOnboardingData?.birthDate || null,
      age: ageFromBirthDate ?? profile?.age ?? savedOnboardingData?.age ?? null,
      height: profile?.height ?? savedOnboardingData?.height ?? null,
      weight: profile?.weight ?? savedOnboardingData?.weight ?? null,
    };

    const mergedGoals = goalsFromLegacy(mergedData.goal, mergedData.goals);
    mergedData.goals = mergedGoals;
    mergedData.goal = primaryGoalFromGoals(mergedGoals);
    if (mergedData.sessionDuration === '60plus') {
      mergedData.sessionDuration = '60min';
    }

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
      const computedAge = calculateAgeFromBirthDate(data.birthDate);
      if (!data.birthDate || !isAgeInAllowedRange(computedAge)) {
        toast.error('Informe uma data de nascimento válida.');
        setStep(2);
        return;
      }

      const normalizedGoals = normalizeGoals(data.goals);
      const sanitizedGoals = normalizedGoals.slice(0, MAX_GOALS_ALLOWED);
      if (sanitizedGoals.length < MIN_GOALS_REQUIRED) {
        toast.error('Selecione pelo menos 1 objetivo.');
        setStep(3);
        return;
      }

      const trimmedHealthDescription = data.healthDescription.trim();
      if (data.hasHealthConditions && (!data.injuryAreas || data.injuryAreas.length === 0)) {
        toast.error('Informe as regiões afetadas para gerar um plano seguro.');
        setStep(9);
        return;
      }

      // Salva perfil com dados biométricos
      await updateProfile({
        name: data.name,
        gender: data.gender,
        birth_date: data.birthDate,
        age: computedAge,
        height: data.height,
        weight: data.weight,
      });

      // Sanitiza trainingDays antes de salvar (normaliza aliases legados e remove duplicatas)
      const normalizedTrainingDays = normalizeTrainingDays(data.trainingDays);
      if (normalizedTrainingDays.length === 0) {
        toast.error('Selecione pelo menos 1 dia de treino válido.');
        return;
      }

      const sanitizedData = {
        ...data,
        age: computedAge,
        goals: sanitizedGoals,
        goal: primaryGoalFromGoals(sanitizedGoals),
        trainingDays: normalizedTrainingDays,
        sessionDuration: data.sessionDuration === '60plus' ? '60min' : data.sessionDuration,
        healthDescription: trimmedHealthDescription,
      };

      // Salva preferências de treino
      await saveOnboardingData(sanitizedData);

      // Salva no sessionStorage temporariamente para a página de resultado
      sessionStorage.setItem('onboardingData', JSON.stringify(sanitizedData));
      
      toast.success('Dados salvos com sucesso! Gerando seu plano...');
      
      // Nota: onboardingData será limpo pela Result.tsx após consumo bem-sucedido.
      // Se o usuário voltar ao onboarding, os dados serão recarregados do banco.
      navigate('/result');
    } catch (error) {
      console.error('[onboarding] save failed:', error);
      toast.error('Não foi possível salvar seus dados. Tente novamente ou fale com o suporte.', {
        duration: 6000,
      });
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
