// PAR-Q (Physical Activity Readiness Questionnaire) — standard 7 questions
// from the original CSEP PAR-Q. Incrementing PAR_Q_VERSION invalidates
// existing responses and forces users to retake.

export const PAR_Q_VERSION = 1;

export const PAR_Q_EXPIRATION_DAYS = 90;

export interface ParQQuestion {
  id: string;
  text: string;
}

export const PAR_Q_QUESTIONS: readonly ParQQuestion[] = [
  {
    id: 'q1',
    text: 'Seu médico já disse que você tem um problema cardíaco e que só deveria fazer atividade física sob supervisão médica?',
  },
  {
    id: 'q2',
    text: 'Você sente dor no peito quando faz atividade física?',
  },
  {
    id: 'q3',
    text: 'No último mês você sentiu dor no peito em repouso (sem estar fazendo atividade física)?',
  },
  {
    id: 'q4',
    text: 'Você já perdeu o equilíbrio por tontura ou já perdeu a consciência?',
  },
  {
    id: 'q5',
    text: 'Você tem algum problema ósseo ou articular que poderia piorar com a prática de atividade física?',
  },
  {
    id: 'q6',
    text: 'Seu médico já prescreveu algum medicamento para pressão arterial ou problema cardíaco?',
  },
  {
    id: 'q7',
    text: 'Você tem conhecimento de alguma outra razão pela qual não deveria praticar atividade física?',
  },
] as const;

export type ParQAnswers = Record<string, boolean>;

export interface ParQStatus {
  requiresAnswers: boolean;
  blocked: boolean;
  lastSubmittedAt: string | null;
}
