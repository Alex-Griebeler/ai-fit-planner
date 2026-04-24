import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { OnboardingData } from '@/types/onboarding';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { normalizeTrainingDays } from '@/lib/trainingDays';
import { goalsFromLegacy, normalizeGoals, primaryGoalFromGoals, MAX_GOALS_ALLOWED } from '@/lib/goals';

interface TrainingSectionProps {
  data: Partial<OnboardingData> | null;
  onSave: (data: Partial<OnboardingData>) => Promise<unknown>;
  isSaving: boolean;
}

const DAYS = [
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
];

const GOALS = [
  { value: 'weight_loss', label: 'Emagrecimento' },
  { value: 'hypertrophy', label: 'Hipertrofia' },
  { value: 'health', label: 'Saúde' },
  { value: 'performance', label: 'Performance' },
];

const DURATIONS = [
  { value: '30min', label: '30 min' },
  { value: '45min', label: '45 min' },
  { value: '60min', label: '60 min' },
];

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
];

export function TrainingSection({ data, onSave, isSaving }: TrainingSectionProps) {
  const [formData, setFormData] = useState({
    goal: '' as OnboardingData['goal'] | '',
    goals: [] as OnboardingData['goals'],
    trainingDays: [] as string[],
    sessionDuration: '' as OnboardingData['sessionDuration'] | '',
    experienceLevel: '' as OnboardingData['experienceLevel'] | '',
    variationPreference: '' as OnboardingData['variationPreference'] | '',
  });

  useEffect(() => {
    if (data) {
      const normalizedGoals = goalsFromLegacy(data.goal, data.goals);
      setFormData({
        goal: primaryGoalFromGoals(normalizedGoals),
        goals: normalizedGoals,
        trainingDays: normalizeTrainingDays(data.trainingDays),
        sessionDuration: data.sessionDuration === '60plus' ? '60min' : (data.sessionDuration || ''),
        experienceLevel: data.experienceLevel || '',
        variationPreference: data.variationPreference || '',
      });
    }
  }, [data]);

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      trainingDays: prev.trainingDays.includes(day)
        ? prev.trainingDays.filter(d => d !== day)
        : [...prev.trainingDays, day],
    }));
  };

  const toggleGoal = (goal: NonNullable<OnboardingData['goal']>) => {
    setFormData((prev) => {
      const normalized = normalizeGoals(prev.goals);
      const hasGoal = normalized.includes(goal);
      if (!hasGoal && normalized.length >= MAX_GOALS_ALLOWED) {
        return prev;
      }
      const nextGoals = hasGoal
        ? normalized.filter((item) => item !== goal)
        : [...normalized, goal];

      return {
        ...prev,
        goals: nextGoals,
        goal: primaryGoalFromGoals(nextGoals),
      };
    });
  };

  const handleSave = async () => {
    const sanitizedTrainingDays = normalizeTrainingDays(formData.trainingDays);
    const sanitizedGoals = normalizeGoals(formData.goals);
    if (sanitizedTrainingDays.length === 0) {
      toast.error('Selecione pelo menos 1 dia de treino');
      return;
    }
    if (sanitizedGoals.length < 1) {
      toast.error('Selecione pelo menos 1 objetivo');
      return;
    }

    try {
      await onSave({
        goal: primaryGoalFromGoals(sanitizedGoals),
        goals: sanitizedGoals,
        trainingDays: sanitizedTrainingDays,
        sessionDuration: formData.sessionDuration === '60plus' ? '60min' : (formData.sessionDuration || null),
        experienceLevel: formData.experienceLevel || null,
        variationPreference: formData.variationPreference || null,
      });
      toast.success('Preferências de treino atualizadas!');
    } catch (error) {
      toast.error('Erro ao atualizar preferências');
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Preferências de Treino</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Objetivo */}
        <div className="space-y-3">
          <Label>Objetivos (1 ou 2)</Label>
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map(goal => (
              <Button
                key={goal.value}
                type="button"
                variant={formData.goals.includes(goal.value as NonNullable<OnboardingData['goal']>) ? 'default' : 'outline'}
                size="sm"
                disabled={!formData.goals.includes(goal.value as NonNullable<OnboardingData['goal']>) && formData.goals.length >= MAX_GOALS_ALLOWED}
                onClick={() => toggleGoal(goal.value as NonNullable<OnboardingData['goal']>)}
              >
                {goal.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Selecionados: {normalizeGoals(formData.goals).length}/{MAX_GOALS_ALLOWED}
          </p>
        </div>

        {/* Dias de Treino */}
        <div className="space-y-3">
          <Label>Dias de Treino</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(day => (
              <Button
                key={day.key}
                type="button"
                variant={formData.trainingDays.includes(day.key) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleDay(day.key)}
                className="min-w-[50px]"
              >
                {day.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Duração da Sessão */}
        <div className="space-y-3">
          <Label>Duração da Sessão</Label>
          <RadioGroup
            value={formData.sessionDuration || ''}
            onValueChange={(value) => setFormData({ ...formData, sessionDuration: value as OnboardingData['sessionDuration'] })}
            className="flex flex-wrap gap-4"
          >
            {DURATIONS.map(duration => (
              <div key={duration.value} className="flex items-center space-x-2">
                <RadioGroupItem value={duration.value} id={duration.value} />
                <Label htmlFor={duration.value} className="font-normal cursor-pointer">{duration.label}</Label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Limite recomendado: até 60 minutos totais por sessão (força + cardio) para manter aderência e qualidade técnica.
          </p>
        </div>

        {/* Nível de Experiência */}
        <div className="space-y-3">
          <Label>Nível de Experiência</Label>
          <RadioGroup
            value={formData.experienceLevel || ''}
            onValueChange={(value) => setFormData({ ...formData, experienceLevel: value as OnboardingData['experienceLevel'] })}
            className="flex flex-wrap gap-4"
          >
            {EXPERIENCE_LEVELS.map(level => (
              <div key={level.value} className="flex items-center space-x-2">
                <RadioGroupItem value={level.value} id={level.value} />
                <Label htmlFor={level.value} className="font-normal cursor-pointer">{level.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Preferência de Variação */}
        <div className="space-y-3">
          <Label>Preferência de Variação</Label>
          <RadioGroup
            value={formData.variationPreference || ''}
            onValueChange={(value) => setFormData({ ...formData, variationPreference: value as OnboardingData['variationPreference'] })}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="low" id="variation-low" />
              <Label htmlFor="variation-low" className="font-normal cursor-pointer">Baixa</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="moderate" id="variation-moderate" />
              <Label htmlFor="variation-moderate" className="font-normal cursor-pointer">Moderada</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="high" id="variation-high" />
              <Label htmlFor="variation-high" className="font-normal cursor-pointer">Alta</Label>
            </div>
          </RadioGroup>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full"
          variant="gradient"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      </CardContent>
    </Card>
  );
}
