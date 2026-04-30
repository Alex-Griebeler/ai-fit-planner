import { useEffect, useState } from 'react';
import { Sparkles, Loader2, Play, StopCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BetaConfig {
  id: number;
  is_active: boolean;
  max_slots: number;
  slots_used: number;
  default_duration_days: number;
  started_at: string | null;
  ended_at: string | null;
}

interface Beneficiary {
  user_id: string;
  email: string | null;
  plan_type: string;
  status: string;
  current_period_end: string | null;
  created_at: string;
}

export function BetaPremiumCard() {
  const [config, setConfig] = useState<BetaConfig | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [maxSlots, setMaxSlots] = useState(30);
  const [durationDays, setDurationDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showList, setShowList] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-beta-premium', {
        body: { action: 'status' },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setConfig(data.config);
      setBeneficiaries(data.beneficiaries ?? []);
      if (data.config) {
        setMaxSlots(data.config.max_slots);
        setDurationDays(data.config.default_duration_days);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar beta');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const callAction = async (action: 'start' | 'update' | 'end') => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-beta-premium', {
        body: { action, maxSlots, durationDays },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (action === 'end') {
        toast.success(
          `Beta encerrado. ${data.revoked} revogado(s)${
            data.skipped_paid > 0 ? ` (${data.skipped_paid} pagantes preservados)` : ''
          }`,
        );
      } else {
        toast.success(action === 'start' ? 'Beta iniciado' : 'Beta atualizado');
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    } finally {
      setIsProcessing(false);
    }
  };

  const slotsUsed = config?.slots_used ?? 0;
  const slotsMax = config?.max_slots ?? 30;
  const percent = slotsMax > 0 ? Math.min(100, (slotsUsed / slotsMax) * 100) : 0;
  const isActive = !!config?.is_active;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Beta Premium Automático
          </div>
          <Button variant="ghost" size="icon" onClick={load} disabled={isLoading || isProcessing}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span
                className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isActive ? 'Ativo' : 'Encerrado'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vagas usadas</span>
                <span className="font-medium">
                  {slotsUsed} / {slotsMax}
                </span>
              </div>
              <Progress value={percent} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Vagas</label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={maxSlots}
                  onChange={(e) => setMaxSlots(Number(e.target.value) || 30)}
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Duração (dias)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={3650}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value) || 30)}
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div className="flex gap-2">
              {!isActive ? (
                <Button
                  onClick={() => callAction('start')}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Iniciar beta
                </Button>
              ) : (
                <Button
                  onClick={() => callAction('update')}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex-1"
                >
                  Atualizar
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={isProcessing || beneficiaries.length === 0}
                    className="flex-1"
                  >
                    <StopCircle className="w-4 h-4 mr-2" />
                    Encerrar e revogar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar beta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso desativa o beta e rebaixa para Free todos os{' '}
                      {beneficiaries.length} usuários que entraram pelo programa. Quem
                      assinou Premium pago via Stripe é preservado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => callAction('end')}>
                      Encerrar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {beneficiaries.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowList((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showList ? 'Ocultar' : 'Ver'} beneficiários ({beneficiaries.length})
                </button>
                {showList && (
                  <div className="mt-2 border border-border rounded-md p-2 space-y-1 max-h-64 overflow-y-auto">
                    {beneficiaries.map((b) => (
                      <div
                        key={b.user_id}
                        className="text-xs flex justify-between gap-2 font-mono"
                      >
                        <span className="truncate">{b.email ?? b.user_id}</span>
                        <span className="text-muted-foreground">
                          {b.plan_type}/{b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
