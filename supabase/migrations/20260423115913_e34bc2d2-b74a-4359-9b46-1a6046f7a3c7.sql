ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date date;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_birth_date_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_birth_date_check
  CHECK (
    birth_date IS NULL
    OR (
      birth_date >= DATE '1900-01-01'
      AND birth_date <= CURRENT_DATE
    )
  );

COMMENT ON COLUMN public.profiles.birth_date IS
  'Data de nascimento do usuário (YYYY-MM-DD). Idade exibida no app deve ser derivada deste campo.';