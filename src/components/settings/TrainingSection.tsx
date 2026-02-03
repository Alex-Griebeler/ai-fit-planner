import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { OnboardingData } from '@/types/onboarding';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

interface TrainingSectionProps {
  data: Partial<OnboardingData> | null;
  onSave: (data: Partial<OnboardingData>) => Promise<unknown>;
  isSaving: boolean;
}

const DAYS = [
  { key: 'monday', label: 'Seg' },
  { key: 'tuesday', label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday', label: 'Qui' },
  { key: 'friday', label: 'Sex' },
  { key: 'saturday', label: 'Sáb' },
  { key: 'sunday', label: 'Dom' },
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
  { value: '60plus', label: '+60 min' },
];

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
];

export function TrainingSection({ data, onSave, isSaving }: TrainingSectionProps) {
  const [formData, setFormData] = useState({
    goal: '' as OnboardingData['goal'] | '',
    trainingDays: [] as string[],
    sessionDuration: '' as OnboardingData['sessionDuration'] | '',
    experienceLevel: '' as OnboardingData['experienceLevel'] | '',
  });

  useEffect(() => {
    if (data) {
      setFormData({
        goal: data.goal || '',
        trainingDays: data.trainingDays || [],
        sessionDuration: data.sessionDuration || '',
        experienceLevel: data.experienceLevel || '',
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

  const handleSave = async () => {
    try {
      await onSave({
        goal: formData.goal || null,
        trainingDays: formData.trainingDays,
        sessionDuration: formData.sessionDuration || null,
        experienceLevel: formData.experienceLevel || null,
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
          <Label>Objetivo Principal</Label>
          <RadioGroup
            value={formData.goal || ''}
            onValueChange={(value) => setFormData({ ...formData, goal: value as OnboardingData['goal'] })}
            className="grid grid-cols-2 gap-2"
          >
            {GOALS.map(goal => (
              <div key={goal.value} className="flex items-center space-x-2">
                <RadioGroupItem value={goal.value} id={goal.value} />
                <Label htmlFor={goal.value} className="font-normal cursor-pointer">{goal.label}</Label>
              </div>
            ))}
          </RadioGroup>
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
