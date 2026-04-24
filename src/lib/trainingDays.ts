export const CANONICAL_TRAINING_DAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type TrainingDayCode = (typeof CANONICAL_TRAINING_DAYS)[number];

const TRAINING_DAY_ALIASES: Record<string, TrainingDayCode> = {
  mon: "mon",
  monday: "mon",
  seg: "mon",
  segunda: "mon",
  "segunda-feira": "mon",

  tue: "tue",
  tuesday: "tue",
  ter: "tue",
  terça: "tue",
  terca: "tue",
  "terça-feira": "tue",
  "terca-feira": "tue",

  wed: "wed",
  wednesday: "wed",
  qua: "wed",
  quarta: "wed",
  "quarta-feira": "wed",

  thu: "thu",
  thursday: "thu",
  qui: "thu",
  quinta: "thu",
  "quinta-feira": "thu",

  fri: "fri",
  friday: "fri",
  sex: "fri",
  sexta: "fri",
  "sexta-feira": "fri",

  sat: "sat",
  saturday: "sat",
  sab: "sat",
  sáb: "sat",
  sabado: "sat",
  sábado: "sat",

  sun: "sun",
  sunday: "sun",
  dom: "sun",
  domingo: "sun",

  "dia 1": "mon",
  "dia 2": "tue",
  "dia 3": "wed",
  "dia 4": "thu",
  "dia 5": "fri",
  "dia 6": "sat",
  "dia 7": "sun",
};

export function normalizeTrainingDay(day: string | null | undefined): TrainingDayCode | null {
  if (!day) return null;
  const normalized = day.toLowerCase().trim();
  return TRAINING_DAY_ALIASES[normalized] ?? null;
}

export function normalizeTrainingDays(days: string[] | null | undefined): TrainingDayCode[] {
  if (!Array.isArray(days)) return [];

  const unique = new Set<TrainingDayCode>();
  for (const day of days) {
    const normalized = normalizeTrainingDay(day);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return [...unique];
}
