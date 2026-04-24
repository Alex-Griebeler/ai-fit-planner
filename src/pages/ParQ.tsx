import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert, ShieldCheck, Dumbbell, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { PAR_Q_QUESTIONS, ParQAnswers } from '@/types/parQ';
import { useParQStatus, useSubmitParQ } from '@/hooks/useParQStatus';
import { useAuth } from '@/hooks/useAuth';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

type Answer = 'yes' | 'no' | undefined;

function draftStorageKey(userId: string | undefined): string | null {
  return userId ? `par-q-draft:${userId}` : null;
}

function readDraft(userId: string | undefined): Record<string, Answer> {
  const key = draftStorageKey(userId);
  if (!key || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Answer>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeDraft(userId: string | undefined, answers: Record<string, Answer>) {
  const key = draftStorageKey(userId);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(answers));
  } catch {
    // Storage can fail in private-mode browsers; drafts are nice-to-have.
  }
}

function clearDraft(userId: string | undefined) {
  const key = draftStorageKey(userId);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

export default function ParQ() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { status, isLoading } = useParQStatus();
  const submit = useSubmitParQ();
  const haptic = useHapticFeedback();

  const [answers, setAnswers] = useState<Record<string, Answer>>(() => readDraft(user?.id));
  const questionRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (user?.id) {
      setAnswers(readDraft(user.id));
    }
  }, [user?.id]);

  useEffect(() => {
    writeDraft(user?.id, answers);
  }, [user?.id, answers]);

  const answeredCount = useMemo(
    () => PAR_Q_QUESTIONS.filter((q) => answers[q.id] !== undefined).length,
    [answers],
  );

  const allAnswered = answeredCount === PAR_Q_QUESTIONS.length;

  const handleAnswer = useCallback(
    (questionId: string, value: Answer, index: number) => {
      haptic.selection();
      setAnswers((prev) => ({ ...prev, [questionId]: value }));

      // Smooth-scroll to the next unanswered question to keep the flow moving.
      const nextIndex = PAR_Q_QUESTIONS.findIndex(
        (q, i) => i > index && answers[q.id] === undefined,
      );
      if (nextIndex !== -1) {
        const el = questionRefs.current[nextIndex];
        if (el) {
          requestAnimationFrame(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        }
      }
    },
    [answers, haptic],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status.blocked) {
    return (
      <BlockedView
        onLogout={async () => {
          await signOut();
          navigate('/login', { replace: true });
        }}
      />
    );
  }

  // User does not need to answer right now. Send them to the dashboard so
  // that a direct visit to /par-q does not show an unnecessary questionnaire.
  if (!status.requiresAnswers) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async () => {
    if (!allAnswered || submit.isPending) return;
    haptic.impact();

    const boolAnswers: ParQAnswers = {};
    for (const q of PAR_Q_QUESTIONS) {
      boolAnswers[q.id] = answers[q.id] === 'yes';
    }

    try {
      await submit.mutateAsync(boolAnswers);
      clearDraft(user?.id);
      const anyYes = Object.values(boolAnswers).some(Boolean);
      if (!anyYes) {
        haptic.notification('success');
        toast.success('Obrigado! Liberado para treinar.');
        navigate('/dashboard', { replace: true });
      } else {
        haptic.notification('warning');
        // The setQueryData in onSuccess flips status.blocked, which triggers
        // the BlockedView branch above on next render.
      }
    } catch (error) {
      haptic.notification('error');
      console.error('[PAR-Q] submit failed:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Não foi possível salvar: ${message}`, { duration: 6000 });
    }
  };

  const isRenewal = !!status.lastSubmittedAt;
  const progressPct = Math.round((answeredCount / PAR_Q_QUESTIONS.length) * 100);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Questionário de prontidão</span>
            <span>{answeredCount} de {PAR_Q_QUESTIONS.length}</span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-3">
              <Dumbbell className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold">
              {isRenewal ? 'Renovação do questionário' : 'Antes de começar'}
            </h1>
            <p className="text-muted-foreground mt-2 leading-relaxed max-w-md mx-auto">
              {isRenewal
                ? 'Sua última resposta venceu. Preciso de 30 segundos pra confirmar que você pode treinar com segurança.'
                : 'Responda estas 7 perguntas rápidas de segurança. É obrigatório e deve ser refeito a cada 3 meses.'}
            </p>
          </div>

          <div className="space-y-3">
            {PAR_Q_QUESTIONS.map((q, index) => {
              const answered = answers[q.id] !== undefined;
              return (
                <div
                  key={q.id}
                  ref={(el) => {
                    questionRefs.current[index] = el;
                  }}
                  className={`rounded-xl border p-4 space-y-3 transition-colors ${
                    answered
                      ? 'border-border bg-card'
                      : 'border-border/60 bg-card/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0 mt-0.5 transition-colors ${
                        answered
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {answered ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed flex-1">
                      {q.text}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="lg"
                      variant={answers[q.id] === 'no' ? 'default' : 'outline'}
                      className="flex-1 h-11"
                      onClick={() => handleAnswer(q.id, 'no', index)}
                      aria-pressed={answers[q.id] === 'no'}
                    >
                      Não
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant={answers[q.id] === 'yes' ? 'default' : 'outline'}
                      className="flex-1 h-11"
                      onClick={() => handleAnswer(q.id, 'yes', index)}
                      aria-pressed={answers[q.id] === 'yes'}
                    >
                      Sim
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
            Esta informação não substitui avaliação médica. Em caso de dúvida,
            consulte um profissional de saúde antes de iniciar a atividade física.
          </p>
        </motion.div>
      </div>

      {/* Sticky submit bar */}
      <AnimatePresence>
        {answeredCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border"
          >
            <div className="max-w-2xl mx-auto px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              <Button
                variant="gradient"
                size="lg"
                className="w-full h-12"
                onClick={handleSubmit}
                disabled={!allAnswered || submit.isPending}
              >
                {submit.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : null}
                {allAnswered
                  ? 'Enviar respostas'
                  : `Responda ${PAR_Q_QUESTIONS.length - answeredCount} ${
                      PAR_Q_QUESTIONS.length - answeredCount === 1 ? 'pergunta' : 'perguntas'
                    } restante${
                      PAR_Q_QUESTIONS.length - answeredCount === 1 ? '' : 's'
                    }`}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BlockedView({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-display font-bold">Precisamos de liberação médica</h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          Pelo menos uma resposta indica que a atividade física deve ser feita apenas sob
          supervisão médica. Por segurança, o aplicativo ficará bloqueado até que um
          profissional de saúde libere você para treinar.
        </p>
        <div className="mt-6 p-4 rounded-xl bg-card border border-border text-left text-sm space-y-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-muted-foreground leading-relaxed">
              Procure um médico (preferencialmente cardiologista ou ortopedista, conforme o
              caso) para uma avaliação pré-exercício.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-muted-foreground leading-relaxed">
              Após liberação, entre em contato com o suporte para reabilitar sua conta.
            </p>
          </div>
        </div>
        <Button variant="outline" className="w-full h-12 mt-6" onClick={onLogout}>
          Sair da conta
        </Button>
      </motion.div>
    </div>
  );
}
