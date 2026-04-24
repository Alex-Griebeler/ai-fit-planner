type SupabaseLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export function isMissingColumnError(
  error: SupabaseLikeError | null | undefined,
  columnName: string,
): boolean {
  if (!error) return false;

  const haystack = [
    error.code,
    error.message,
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const normalizedColumn = columnName.toLowerCase();

  return (
    haystack.includes(normalizedColumn)
    && (
      haystack.includes("pgrst204")
      || haystack.includes("schema cache")
      || haystack.includes("could not find")
      || haystack.includes("does not exist")
      || haystack.includes("column")
    )
  );
}

export function omitKeys<T extends Record<string, unknown>>(
  payload: T,
  keys: string[],
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...payload };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}

