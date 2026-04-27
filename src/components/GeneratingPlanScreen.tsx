import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Brain, ShieldCheck, Dumbbell, Sparkles } from 'lucide-react';

interface GeneratingPlanScreenProps {
  isCreatingNewPlan: boolean;
}

const STEPS = [
  { icon: Brain, label: 'Analisando seu questionário', durationMs: 4000 },
  { icon: ShieldCheck, label: 'Validando segurança clínica', durationMs: 5000 },
  { icon: Dumbbell, label: 'Selecionando exercícios ideais', durationMs: 8000 },
  { icon: Sparkles, label: 'Personalizando volume e intensidade', durationMs: 10000 },
];

export function GeneratingPlanScreen({ isCreatingNewPlan }: GeneratingPlanScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isCreatingNewPlan) return;

    // Step progression
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 0;
    STEPS.forEach((step, index) => {
      cumulative += step.durationMs;
      timeouts.push(
        setTimeout(() => {
          setCurrentStep(Math.min(index + 1, STEPS.length - 1));
        }, cumulative),
      );
    });

    // Simulated progress bar — eases toward 95% (never completes until plan arrives)
    const totalMs = STEPS.reduce((acc, s) => acc + s.durationMs, 0);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      // Asymptotic curve: approaches 95% as elapsed → totalMs
      const ratio = elapsed / totalMs;
      const eased = 1 - Math.exp(-2.5 * ratio);
      setProgress(Math.min(95, Math.round(eased * 95)));
    }, 200);

    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [isCreatingNewPlan]);

  if (!isCreatingNewPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          role="status"
          aria-label="Carregando"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="w-12 h-12 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            role="status"
            aria-label="Gerando"
          />
          <h2 className="text-foreground text-lg font-semibold mb-1">
            Montando seu plano personalizado
          </h2>
          <p className="text-muted-foreground text-sm">
            Isso pode levar até 30 segundos.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8" aria-label="Progresso da geração" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut', duration: 0.4 }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-right tabular-nums">
            {progress}%
          </p>
        </div>

        {/* Steps list */}
        <ul className="space-y-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isDone = index < currentStep;
            const isActive = index === currentStep;
            const isPending = index > currentStep;
            return (
              <li
                key={step.label}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  isActive
                    ? 'border-primary/40 bg-primary/5'
                    : isDone
                      ? 'border-border bg-card/40'
                      : 'border-border bg-card/20'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isDone
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {isDone ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Check className="h-4 w-4" />
                      </motion.span>
                    ) : isActive ? (
                      <motion.span
                        key="spin"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Icon className="h-4 w-4" />
                      </motion.span>
                    ) : (
                      <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Icon className="h-4 w-4" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <p
                  className={`text-sm ${
                    isPending ? 'text-muted-foreground' : 'text-foreground font-medium'
                  }`}
                >
                  {step.label}
                </p>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </div>
  );
}
