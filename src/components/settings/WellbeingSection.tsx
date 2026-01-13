import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OnboardingData } from '@/types/onboarding';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

interface WellbeingSectionProps {
  data: Partial<OnboardingData> | null;
  onSave: (data: Partial<OnboardingData>) => Promise<unknown>;
  isSaving: boolean;
}

const SLEEP_OPTIONS = [
  { value: 'less_than_5', label: 'Menos de 5h' },
  { value: '5_to_6', label: '5-6h' },
  { value: '6_to_7', label: '6-7h' },
  { value: '7_to_8', label: '7-8h' },
  { value: 'more_than_8', label: 'Mais de 8h' },
];

export function WellbeingSection({ data, onSave, isSaving }: WellbeingSectionProps) {
  const [formData, setFormData] = useState({
    sleepHours: '' as string,
    stressLevel: '' as OnboardingData['stressLevel'] | '',
  });

  useEffect(() => {
    if (data) {
      setFormData({
        sleepHours: data.sleepHours || '',
        stressLevel: data.stressLevel || '',
      });
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await onSave({
        sleepHours: formData.sleepHours || null,
        stressLevel: formData.stressLevel || null,
      });
      toast.success('Dados de bem-estar atualizados!');
    } catch (error) {
      toast.error('Erro ao atualizar dados de bem-estar');
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Sono e Bem-estar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Horas de Sono */}
        <div className="space-y-3">
          <Label>Horas de Sono por Noite</Label>
          <Select
            value={formData.sleepHours}
            onValueChange={(value) => setFormData({ ...formData, sleepHours: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {SLEEP_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Nível de Estresse */}
        <div className="space-y-3">
          <Label>Nível de Estresse</Label>
          <RadioGroup
            value={formData.stressLevel || ''}
            onValueChange={(value) => setFormData({ ...formData, stressLevel: value as OnboardingData['stressLevel'] })}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-muted-foreground transition-colors">
              <RadioGroupItem value="low" id="stress-low" className="mt-0.5" />
              <div>
                <Label htmlFor="stress-low" className="font-medium cursor-pointer">Baixo</Label>
                <p className="text-sm text-muted-foreground">
                  Geralmente relaxado, sem grandes preocupações
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-muted-foreground transition-colors">
              <RadioGroupItem value="moderate" id="stress-moderate" className="mt-0.5" />
              <div>
                <Label htmlFor="stress-moderate" className="font-medium cursor-pointer">Moderado</Label>
                <p className="text-sm text-muted-foreground">
                  Alguns momentos de tensão, mas controlável
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-muted-foreground transition-colors">
              <RadioGroupItem value="high" id="stress-high" className="mt-0.5" />
              <div>
                <Label htmlFor="stress-high" className="font-medium cursor-pointer">Alto</Label>
                <p className="text-sm text-muted-foreground">
                  Frequentemente ansioso ou sobrecarregado
                </p>
              </div>
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
