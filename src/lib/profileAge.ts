export const MIN_ALLOWED_AGE = 13;
export const MAX_ALLOWED_AGE = 120;

function toUtcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function parseBirthDateInput(birthDate: string): Date | null {
  const parts = birthDate.split("-").map(Number);
  if (parts.length !== 3) return null;

  const [year, month, day] = parts;
  if (!year || !month || !day) return null;

  const parsed = toUtcDate(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;

  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function calculateAgeFromBirthDate(
  birthDate: string | null | undefined,
  referenceDate: Date = new Date(),
): number | null {
  if (!birthDate) return null;

  const birthDateUtc = parseBirthDateInput(birthDate);
  if (!birthDateUtc) return null;

  const todayUtc = toUtcDate(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );

  if (birthDateUtc > todayUtc) return null;

  let age = todayUtc.getUTCFullYear() - birthDateUtc.getUTCFullYear();
  const hasNotHadBirthdayThisYear = (
    todayUtc.getUTCMonth() < birthDateUtc.getUTCMonth()
    || (
      todayUtc.getUTCMonth() === birthDateUtc.getUTCMonth()
      && todayUtc.getUTCDate() < birthDateUtc.getUTCDate()
    )
  );

  if (hasNotHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
}

export function isAgeInAllowedRange(age: number | null): age is number {
  return age !== null && age >= MIN_ALLOWED_AGE && age <= MAX_ALLOWED_AGE;
}

function formatDateForInput(date: Date): string {
  const normalized = toUtcDate(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return normalized.toISOString().slice(0, 10);
}

export function getBirthDateBounds(referenceDate: Date = new Date()): {
  min: string;
  max: string;
} {
  const todayUtc = toUtcDate(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );

  const minDate = new Date(todayUtc);
  minDate.setUTCFullYear(todayUtc.getUTCFullYear() - MAX_ALLOWED_AGE);

  const maxDate = new Date(todayUtc);
  maxDate.setUTCFullYear(todayUtc.getUTCFullYear() - MIN_ALLOWED_AGE);

  return {
    min: formatDateForInput(minDate),
    max: formatDateForInput(maxDate),
  };
}
