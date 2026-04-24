import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert, ShieldCheck, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { PAR_Q_QUESTIONS, ParQAnswers } from '@/types/parQ';
import { useParQStatus, useSubmitParQ } from '@/hooks/useParQStatus';
import { useAuth } from '@/hooks/useAuth';

type Answer = 'yes' | 'no' | undefined;

export default function ParQ() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { status, isLoading } = useParQStatus();
  const submit = useSubmitParQ();

  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  const allAnswered = useMemo(
    () => PAR_Q_QUESTIONS.every((q) => answers[q.id] !== undefined),
    [answers],
  );

  if (isLoading || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status.blocked) {
    return <BlockedView onLogout={async () => { await signOut(); navigate('/login', { replace: true }); }} />;
  }

  const handleSubmit = async () => {
    if (!allAnswered) return;
    const boolAnswers: ParQAnswers = {};
    for (const q of PAR_Q_QUESTIONS) {
      boolAnswers[q.id] = answers[q.id] === 'yes';
    }
    try {
      await submit.mutateAsync(boolAnswers);
      const anyYes = Object.values(boolAnswers).some(Boolean);
      if (!anyYes) {
        toast.success('Obrigado! Liberado para treinar.');
        navigate('/dashboard', { replace: true });
      }
      // If anyYes is true the ParQGate will flip status.blocked on refetch
      // and this page will render BlockedView on next render.
    } catch (error) {
      console.error('[PAR-Q] submit failed:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Não foi possível salvar suas respostas: ${message}`, { duration: 6000 });
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
              <Dumbbell className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold">Questionário de prontidão</h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Antes de treinar, responda estas 7 perguntas de segurança. Elas ajudam a evitar
              riscos cardiovasculares e ortopédicos durante o exercício. É obrigatório e deve
              ser refeito a cada 3 meses.
            </p>
          </div>

          <div className="space-y-3">
            {PAR_Q_QUESTIONS.map((q, index) => (
              <div
                key={q.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground mr-2">{index + 1}.</span>
                  {q.text}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={answers[q.id] === 'no' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: 'no' }))}
                  >
                    Não
                  </Button>
                  <Button
                    type="button"
                    variant={answers[q.id] === 'yes' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: 'yes' }))}
                  >
                    Sim
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={!allAnswered || submit.isPending}
            >
              {submit.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Enviar respostas
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Esta informação não substitui avaliação médica. Em caso de dúvida, consulte um
              profissional de saúde antes de iniciar a atividade física.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function BlockedView({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-display font-bold">Precisamos de liberação médica</h1>
        <p className="text-muted-foreground mt-3">
          Pelo menos uma resposta indica que a atividade física deve ser feita apenas sob
          supervisão médica. Por segurança, o aplicativo ficará bloqueado até que um
          profissional de saúde libere você para treinar.
        </p>
        <div className="mt-6 p-4 rounded-lg bg-card border border-border text-left text-sm space-y-2">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              Procure um médico (preferencialmente cardiologista ou ortopedista, conforme o
              caso) para uma avaliação pré-exercício.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              Após liberação, entre em contato com o suporte para reabilitar sua conta.
            </p>
          </div>
        </div>
        <Button variant="outline" className="w-full mt-6" onClick={onLogout}>
          Sair da conta
        </Button>
      </motion.div>
    </div>
  );
}
