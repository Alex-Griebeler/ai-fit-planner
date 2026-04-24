import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  OnboardingData,
  INJURY_AREA_OPTIONS,
  INJURY_SIDE_OPTIONS,
  INJURY_SEVERITY_OPTIONS,
  INJURY_DURATION_OPTIONS,
  SIDE_RELEVANT_INJURIES,
  InjuryArea,
  InjuryDetail,
  InjuryDetails,
} from '@/types/onboarding';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

interface HealthSectionProps {
  data: Partial<OnboardingData> | null;
  onSave: (data: Partial<OnboardingData>) => Promise<unknown>;
  isSaving: boolean;
}

function getAreaLabel(areaKey: InjuryArea): string {
  return INJURY_AREA_OPTIONS.find((a) => a.key === areaKey)?.label ?? areaKey;
}

export function HealthSection({ data, onSave, isSaving }: HealthSectionProps) {
  const [formData, setFormData] = useState({
    hasHealthConditions: false,
    injuryAreas: [] as InjuryArea[],
    injuryDetails: {} as InjuryDetails,
    healthDescription: '',
  });

  useEffect(() => {
    if (data) {
      setFormData({
        hasHealthConditions: data.hasHealthConditions || false,
        injuryAreas: data.injuryAreas || [],
        injuryDetails: data.injuryDetails || {},
        healthDescription: data.healthDescription || '',
      });
    }
  }, [data]);

  const toggleInjuryArea = (area: InjuryArea) => {
    setFormData((prev) => {
      const isSelected = prev.injuryAreas.includes(area);
      if (isSelected) {
        const nextDetails = { ...prev.injuryDetails };
        delete nextDetails[area];
        return {
          ...prev,
          injuryAreas: prev.injuryAreas.filter((a) => a !== area),
          injuryDetails: nextDetails,
        };
      }
      return {
        ...prev,
        injuryAreas: [...prev.injuryAreas, area],
      };
    });
  };

  const updateDetail = <K extends keyof InjuryDetail>(
    areaKey: InjuryArea,
    field: K,
    value: InjuryDetail[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      injuryDetails: {
        ...prev.injuryDetails,
        [areaKey]: { ...(prev.injuryDetails[areaKey] ?? {}), [field]: value },
      },
    }));
  };

  const handleSave = async () => {
    if (formData.hasHealthConditions && formData.injuryAreas.length === 0) {
      toast.error('Selecione ao menos uma área afetada.');
      return;
    }

    try {
      await onSave({
        hasHealthConditions: formData.hasHealthConditions,
        injuryAreas: formData.injuryAreas,
        injuryDetails: formData.injuryDetails,
        healthDescription: formData.healthDescription.trim(),
      });
      toast.success('Dados de saúde atualizados!');
    } catch (error) {
      console.error('[health-section] save failed:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao atualizar dados de saúde: ${message}`, { duration: 6000 });
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Dados de Saúde</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="hasHealthConditions"
            checked={formData.hasHealthConditions}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({
                ...prev,
                hasHealthConditions: !!checked,
                injuryAreas: checked ? prev.injuryAreas : [],
                injuryDetails: checked ? prev.injuryDetails : {},
                healthDescription: checked ? prev.healthDescription : '',
              }))
            }
          />
          <Label htmlFor="hasHealthConditions" className="cursor-pointer">
            Possuo lesões ou condições de saúde relevantes
          </Label>
        </div>

        {formData.hasHealthConditions && (
          <div className="space-y-3">
            <Label>Áreas Afetadas</Label>
            <div className="grid grid-cols-2 gap-3">
              {INJURY_AREA_OPTIONS.map((area) => (
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
                </div>
              ))}
            </div>
          </div>
        )}

        {formData.hasHealthConditions && formData.injuryAreas.length > 0 && (
          <div className="space-y-3">
            <Label>Detalhes por região (opcional)</Label>
            {formData.injuryAreas.map((areaKey) => {
              const detail = formData.injuryDetails[areaKey] ?? {};
              const sideApplies = SIDE_RELEVANT_INJURIES.includes(areaKey);
              return (
                <div
                  key={areaKey}
                  className="rounded-lg border border-border bg-card/40 p-3 space-y-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    {getAreaLabel(areaKey)}
                  </p>
                  {sideApplies && (
                    <ChipRow
                      label="Lado"
                      options={INJURY_SIDE_OPTIONS}
                      value={detail.side}
                      onChange={(v) => updateDetail(areaKey, 'side', v)}
                    />
                  )}
                  <ChipRow
                    label="Intensidade"
                    options={INJURY_SEVERITY_OPTIONS}
                    value={detail.severity}
                    onChange={(v) => updateDetail(areaKey, 'severity', v)}
                  />
                  <ChipRow
                    label="Há quanto tempo"
                    options={INJURY_DURATION_OPTIONS}
                    value={detail.duration}
                    onChange={(v) => updateDetail(areaKey, 'duration', v)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {formData.hasHealthConditions && (
          <div className="space-y-2">
            <Label htmlFor="healthDescription">
              Observações Adicionais
              <span className="text-xs font-normal text-muted-foreground ml-2">(opcional)</span>
            </Label>
            <Textarea
              id="healthDescription"
              value={formData.healthDescription}
              onChange={(e) => setFormData({ ...formData, healthDescription: e.target.value })}
              placeholder="Ex.: dor no ombro direito há 3 meses, piora ao elevar o braço acima da cabeça."
              rows={4}
              maxLength={500}
            />
            <div className="flex items-center justify-end">
              <p className="text-xs text-muted-foreground">
                {formData.healthDescription.trim().length}/500
              </p>
            </div>
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

interface ChipRowProps<V extends string> {
  label: string;
  options: { value: V; label: string }[];
  value: V | undefined;
  onChange: (value: V) => void;
}

function ChipRow<V extends string>({ label, options, value, onChange }: ChipRowProps<V>) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                selected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
