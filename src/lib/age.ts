/**
 * Calculate age in years from an ISO yyyy-mm-dd birth date.
 * Returns null if the input is empty or invalid.
 */
export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  if (age < 0 || age > 130) return null;
  return age;
}

export const MIN_BIRTH_DATE = '1900-01-01';
export const MIN_AGE_YEARS = 13;
export const MAX_AGE_YEARS = 120;
