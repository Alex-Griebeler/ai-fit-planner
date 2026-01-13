import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { OnboardingData, INJURY_AREA_OPTIONS, InjuryArea } from '@/types/onboarding';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

interface HealthSectionProps {
  data: Partial<OnboardingData> | null;
  onSave: (data: Partial<OnboardingData>) => Promise<unknown>;
  isSaving: boolean;
}

export function HealthSection({ data, onSave, isSaving }: HealthSectionProps) {
  const [formData, setFormData] = useState({
    hasHealthConditions: false,
    injuryAreas: [] as InjuryArea[],
    healthDescription: '',
  });

  useEffect(() => {
    if (data) {
      setFormData({
        hasHealthConditions: data.hasHealthConditions || false,
        injuryAreas: data.injuryAreas || [],
        healthDescription: data.healthDescription || '',
      });
    }
  }, [data]);

  const toggleInjuryArea = (area: InjuryArea) => {
    setFormData(prev => ({
      ...prev,
      injuryAreas: prev.injuryAreas.includes(area)
        ? prev.injuryAreas.filter(a => a !== area)
        : [...prev.injuryAreas, area],
    }));
  };

  const handleSave = async () => {
    try {
      await onSave({
        hasHealthConditions: formData.hasHealthConditions,
        injuryAreas: formData.injuryAreas,
        healthDescription: formData.healthDescription,
      });
      toast.success('Dados de saúde atualizados!');
    } catch (error) {
      toast.error('Erro ao atualizar dados de saúde');
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Dados de Saúde</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tem condições de saúde */}
        <div className="flex items-center space-x-3">
          <Checkbox
            id="hasHealthConditions"
            checked={formData.hasHealthConditions}
            onCheckedChange={(checked) => setFormData({ ...formData, hasHealthConditions: !!checked })}
          />
          <Label htmlFor="hasHealthConditions" className="cursor-pointer">
            Possuo lesões ou condições de saúde relevantes
          </Label>
        </div>

        {/* Áreas de Lesão */}
        {formData.hasHealthConditions && (
          <div className="space-y-3">
            <Label>Áreas Afetadas</Label>
            <div className="grid grid-cols-2 gap-3">
              {INJURY_AREA_OPTIONS.map(area => (
                <div
                  key={area.key}
                  onClick={() => toggleInjuryArea(area.key)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    formData.injuryAreas.includes(area.key)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <div className="font-medium text-foreground">{area.label}</div>
                  <div className="text-xs text-muted-foreground">{area.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Descrição de Saúde */}
        {formData.hasHealthConditions && (
          <div className="space-y-2">
            <Label htmlFor="healthDescription">Observações Adicionais</Label>
            <Textarea
              id="healthDescription"
              value={formData.healthDescription}
              onChange={(e) => setFormData({ ...formData, healthDescription: e.target.value })}
              placeholder="Descreva suas condições de saúde, lesões ou limitações..."
              rows={4}
            />
          </div>
        )}

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
