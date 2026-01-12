import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingData, initialOnboardingData } from '@/types/onboarding';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { DaySelector } from '@/components/onboarding/DaySelector';
import { BodySelector } from '@/components/onboarding/BodySelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/useProfile';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { toast } from 'sonner';
import {
  Target,
  TrendingUp,
  Heart,
  Zap,
  Clock,
  Dumbbell,
  User,
  Shuffle,
  Moon,
  CheckCircle,
  Loader2,
} from 'lucide-react';

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
    } else {
      handleFinish();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return data.name.trim().length >= 2;
      case 2:
        return data.gender !== null && data.age !== null && data.height !== null && data.weight !== null;
      case 3:
        return data.goal !== null;
      case 4:
        return data.timeframe !== null;
      case 5:
        return data.trainingDays.length >= 1;
      case 6:
        return data.sessionDuration !== null;
      case 7:
        return data.exerciseTypes.length >= 1;
      case 8:
        return data.experienceLevel !== null;
      case 9:
        return data.variationPreference !== null;
      case 10:
        return data.bodyAreas.length >= 1;
      case 11:
        return true;
      case 12:
        return data.sleepHours !== null && data.stressLevel !== null;
      default:
        return false;
    }
  };

  const isLoading = isSubmitting || isUpdatingProfile || isSaving;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <OnboardingLayout
            step={1}
            totalSteps={TOTAL_STEPS}
            title="Como gostaria de ser chamado(a)?"
            subtitle="Tornando sua experiência personalizada"
            showBack={false}
          >
            <div className="space-y-6">
              <Input
                placeholder="Ex: João, Maria, Nina..."
                value={data.name}
                onChange={(e) => updateData('name', e.target.value)}
                className="text-lg"
                autoFocus
              />
              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={nextStep}
                disabled={!canProceed()}
              >
                Continuar
              </Button>
            </div>
          </OnboardingLayout>
        );

      case 2:
        return (
          <OnboardingLayout
            step={2}
            totalSteps={TOTAL_STEPS}
            title={`${data.name}, seus dados estão corretos?`}
            subtitle="Precisamos dessas informações para personalizar seus treinos"
            onBack={prevStep}
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Idade</label>
                  <Input
                    type="number"
                    placeholder="25"
                    value={data.age || ''}
                    onChange={(e) => updateData('age', parseInt(e.target.value) || null)}
                  />
                </div>
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
                onClick={nextStep}
                disabled={!canProceed()}
              >
                Continuar
              </Button>
            </div>
          </OnboardingLayout>
        );

      case 3:
        return (
          <OnboardingLayout
            step={3}
            totalSteps={TOTAL_STEPS}
            title="Qual é seu objetivo principal?"
            subtitle="Selecione o objetivo que mais se identifica com você"
            onBack={prevStep}
          >
            <div className="space-y-3 mb-6">
              <OptionCard
                title="Emagrecimento"
                description="Perder peso e definir o corpo"
                icon={<Target className="w-6 h-6" />}
                selected={data.goal === 'weight_loss'}
                onClick={() => updateData('goal', 'weight_loss')}
              />
              <OptionCard
                title="Hipertrofia"
                description="Ganhar massa muscular"
                icon={<TrendingUp className="w-6 h-6" />}
                selected={data.goal === 'hypertrophy'}
                onClick={() => updateData('goal', 'hypertrophy')}
              />
              <OptionCard
                title="Saúde e bem-estar"
                description="Melhorar saúde geral"
                icon={<Heart className="w-6 h-6" />}
                selected={data.goal === 'health'}
                onClick={() => updateData('goal', 'health')}
              />
              <OptionCard
                title="Performance física"
                description="Melhorar desempenho atlético"
                icon={<Zap className="w-6 h-6" />}
                selected={data.goal === 'performance'}
                onClick={() => updateData('goal', 'performance')}
              />
            </div>
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Continuar
            </Button>
          </OnboardingLayout>
        );

      case 4:
        return (
          <OnboardingLayout
            step={4}
            totalSteps={TOTAL_STEPS}
            title="Em quanto tempo você quer alcançar seus objetivos?"
            subtitle="Isso nos ajuda a criar um plano realista para você"
            onBack={prevStep}
          >
            <div className="space-y-3 mb-6">
              {[
                { value: '3months', label: '3 meses', desc: 'Mudanças visíveis' },
                { value: '6months', label: '6 meses', desc: 'Transformação completa' },
                { value: '12months', label: '+12 meses', desc: 'Mudança de estilo de vida' },
              ].map((option) => (
                <OptionCard
                  key={option.value}
                  title={option.label}
                  description={option.desc}
                  icon={<Clock className="w-6 h-6" />}
                  selected={data.timeframe === option.value}
                  onClick={() => updateData('timeframe', option.value as OnboardingData['timeframe'])}
                />
              ))}
            </div>
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Continuar
            </Button>
          </OnboardingLayout>
        );

      case 5:
        return (
          <OnboardingLayout
            step={5}
            totalSteps={TOTAL_STEPS}
            title="Quais dias da semana você pode treinar?"
            subtitle="Selecione os dias que funcionam melhor para sua rotina"
            onBack={prevStep}
          >
            <div className="space-y-6 mb-6">
              <DaySelector
                selectedDays={data.trainingDays}
                onChange={(days) => updateData('trainingDays', days)}
              />
            </div>
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Continuar
            </Button>
          </OnboardingLayout>
        );

      case 6:
        return (
          <OnboardingLayout
            step={6}
            totalSteps={TOTAL_STEPS}
            title="Quanto tempo você tem disponível para treinar?"
            subtitle="Vamos adequar os treinos ao seu tempo disponível"
            onBack={prevStep}
          >
            <div className="space-y-3 mb-6">
              {[
                { value: '30min', label: '30 minutos', desc: 'Treino moderado' },
                { value: '45min', label: '45 minutos', desc: 'Treino completo' },
                { value: '60min', label: '60 minutos', desc: 'Treino intenso' },
                { value: '60plus', label: '+60 minutos', desc: 'Treino longo' },
              ].map((option) => (
                <OptionCard
                  key={option.value}
                  title={option.label}
                  description={option.desc}
                  icon={<Clock className="w-6 h-6" />}
                  selected={data.sessionDuration === option.value}
                  onClick={() => updateData('sessionDuration', option.value as OnboardingData['sessionDuration'])}
                />
              ))}
            </div>
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Continuar
            </Button>
          </OnboardingLayout>
        );

      case 7:
        return (
          <OnboardingLayout
            step={7}
            totalSteps={TOTAL_STEPS}
            title="Que tipos de exercícios você prefere?"
            subtitle="Selecione os tipos que você tem acesso ou prefere usar"
            onBack={prevStep}
          >
            <div className="space-y-3 mb-4">
              {[
                { value: 'machines', label: 'Máquinas', desc: 'Máquinas e equipamentos de academia' },
                { value: 'free_weights', label: 'Pesos livres', desc: 'Halteres, barras e anilhas' },
                { value: 'bodyweight', label: 'Peso corporal', desc: 'Exercícios usando apenas o corpo' },
              ].map((option) => {
                const isSelected = data.exerciseTypes.includes(option.value);
                return (
                  <OptionCard
                    key={option.value}
                    title={option.label}
                    description={option.desc}
                    icon={<Dumbbell className="w-6 h-6" />}
                    selected={isSelected}
                    onClick={() => {
                      if (isSelected) {
                        updateData('exerciseTypes', data.exerciseTypes.filter((t) => t !== option.value));
                      } else {
                        updateData('exerciseTypes', [...data.exerciseTypes, option.value]);
                      }
                    }}
                  />
                );
              })}
            </div>

            <label className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={data.includeCardio}
                onChange={(e) => updateData('includeCardio', e.target.checked)}
                className="w-5 h-5 rounded accent-primary"
              />
              <span className="text-foreground font-medium">Incluir exercícios cardiovasculares</span>
            </label>

            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Continuar
            </Button>
          </OnboardingLayout>
        );

      case 8:
        return (
          <OnboardingLayout
            step={8}
            totalSteps={TOTAL_STEPS}
            title="Qual é o seu nível de experiência?"
            subtitle="Isso nos ajuda a ajustar a intensidade dos treinos"
            onBack={prevStep}
          >
            <div className="space-y-3 mb-6">
              {[
                { value: 'beginner', label: 'Iniciante', desc: 'Pouca ou nenhuma experiência com exercícios' },
                { value: 'intermediate', label: 'Intermediário', desc: 'Alguma experiência, treino há alguns meses' },
                { value: 'advanced', label: 'Avançado', desc: 'Muita experiência, treino há anos' },
              ].map((option) => (
                <OptionCard
                  key={option.value}
                  title={option.label}
                  description={option.desc}
                  icon={<User className="w-6 h-6" />}
                  selected={data.experienceLevel === option.value}
                  onClick={() => updateData('experienceLevel', option.value as OnboardingData['experienceLevel'])}
                />
              ))}
            </div>
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Continuar
            </Button>
          </OnboardingLayout>
        );

      case 9:
        return (
          <OnboardingLayout
            step={9}
            totalSteps={TOTAL_STEPS}
            title="Você prefere treinos com muita ou pouca variação?"
            subtitle="Isso nos ajuda a personalizar a frequência de mudanças"
            onBack={prevStep}
          >
            <div className="space-y-3 mb-6">
              {[
                { value: 'high', label: 'Alta variação', desc: 'Treinos sempre diferentes e novos exercícios' },
                { value: 'moderate', label: 'Variação moderada', desc: 'Algumas mudanças regulares nos treinos' },
                { value: 'low', label: 'Pouca variação', desc: 'Treinos consistentes com poucas mudanças' },
              ].map((option) => (
                <OptionCard
                  key={option.value}
                  title={option.label}
                  description={option.desc}
                  icon={<Shuffle className="w-6 h-6" />}
                  selected={data.variationPreference === option.value}
                  onClick={() => updateData('variationPreference', option.value as OnboardingData['variationPreference'])}
                />
              ))}
            </div>
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Continuar
            </Button>
          </OnboardingLayout>
        );

      case 10:
        return (
          <OnboardingLayout
            step={10}
            totalSteps={TOTAL_STEPS}
            title="Em quais áreas do corpo você quer focar?"
            subtitle="Selecione as áreas que você mais quer trabalhar"
            onBack={prevStep}
          >
            <div className="mb-6">
              <BodySelector
                selectedAreas={data.bodyAreas}
                onChange={(areas) => updateData('bodyAreas', areas)}
              />
            </div>
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Continuar
            </Button>
          </OnboardingLayout>
        );

      case 11:
        return (
          <OnboardingLayout
            step={11}
            totalSteps={TOTAL_STEPS}
            title="Você tem alguma lesão ou condição médica?"
            subtitle="Isso nos ajuda a adaptar os exercícios para sua segurança"
            onBack={prevStep}
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
              onClick={nextStep}
            >
              Continuar
            </Button>
          </OnboardingLayout>
        );

      case 12:
        return (
          <OnboardingLayout
            step={12}
            totalSteps={TOTAL_STEPS}
            title="Sono e Estresse"
            subtitle="Essas informações nos ajudam a ajustar a intensidade dos treinos"
            onBack={prevStep}
          >
            <div className="space-y-6 mb-6">
              <div>
                <label className="text-sm text-muted-foreground mb-3 block">
                  Quantas horas você dorme por noite?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'less5', label: 'Menos de 5h' },
                    { value: '5-6', label: '5-6h' },
                    { value: '6-7', label: '6-7h' },
                    { value: '7-8', label: '7-8h' },
                    { value: 'more8', label: 'Mais de 8h' },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={data.sleepHours === option.value ? 'default' : 'outline'}
                      onClick={() => updateData('sleepHours', option.value)}
                      className="h-11"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-3 block">
                  Qual seu nível de estresse no dia a dia?
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'low', label: 'Baixo', icon: <Moon className="w-5 h-5" /> },
                    { value: 'moderate', label: 'Moderado', icon: <Moon className="w-5 h-5" /> },
                    { value: 'high', label: 'Alto', icon: <Zap className="w-5 h-5" /> },
                  ].map((option) => (
                    <OptionCard
                      key={option.value}
                      title={option.label}
                      icon={option.icon}
                      selected={data.stressLevel === option.value}
                      onClick={() => updateData('stressLevel', option.value as OnboardingData['stressLevel'])}
                    />
                  ))}
                </div>
              </div>
            </div>

            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={nextStep}
              disabled={!canProceed() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Finalizar Questionário'
              )}
            </Button>
          </OnboardingLayout>
        );

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
