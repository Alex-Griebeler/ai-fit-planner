-- ═══════════════════════════════════════════════════════════════════════════════
-- PERSISTÊNCIA DE DADOS PARA ESCALA
-- Tabelas: profiles, workout_plans, user_onboarding_data
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. TABELA DE PERFIS DE USUÁRIO
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('female', 'male', 'other')),
    age INTEGER CHECK (age >= 13 AND age <= 120),
    height INTEGER CHECK (height >= 100 AND height <= 250),
    weight INTEGER CHECK (weight >= 30 AND weight <= 300),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. TABELA DE DADOS DE ONBOARDING (preferências de treino)
CREATE TABLE public.user_onboarding_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    goal TEXT CHECK (goal IN ('weight_loss', 'hypertrophy', 'health', 'performance')),
    timeframe TEXT CHECK (timeframe IN ('3months', '6months', '12months')),
    training_days TEXT[] DEFAULT '{}',
    session_duration TEXT CHECK (session_duration IN ('30min', '45min', '60min', '60plus')),
    exercise_types TEXT[] DEFAULT '{}',
    include_cardio BOOLEAN DEFAULT false,
    experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    variation_preference TEXT CHECK (variation_preference IN ('high', 'moderate', 'low')),
    body_areas TEXT[] DEFAULT '{}',
    has_health_conditions BOOLEAN DEFAULT false,
    health_description TEXT DEFAULT '',
    sleep_hours TEXT,
    stress_level TEXT CHECK (stress_level IN ('low', 'moderate', 'high')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. TABELA DE PLANOS DE TREINO SALVOS
CREATE TABLE public.workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_name TEXT NOT NULL,
    description TEXT,
    weekly_frequency INTEGER NOT NULL CHECK (weekly_frequency >= 1 AND weekly_frequency <= 7),
    session_duration TEXT NOT NULL,
    periodization TEXT,
    plan_data JSONB NOT NULL, -- Armazena o plano completo (workouts, weeklyVolume, progressionPlan)
    is_active BOOLEAN DEFAULT true, -- Plano ativo do usuário
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE -- Para renovação/expiração do plano
);

-- Índice para buscar planos ativos do usuário rapidamente
CREATE INDEX idx_workout_plans_user_active ON public.workout_plans(user_id, is_active) WHERE is_active = true;

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES - PROFILES
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- 6. RLS POLICIES - USER_ONBOARDING_DATA
CREATE POLICY "Users can view own onboarding data"
    ON public.user_onboarding_data FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding data"
    ON public.user_onboarding_data FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding data"
    ON public.user_onboarding_data FOR UPDATE
    USING (auth.uid() = user_id);

-- 7. RLS POLICIES - WORKOUT_PLANS
CREATE POLICY "Users can view own workout plans"
    ON public.workout_plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout plans"
    ON public.workout_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout plans"
    ON public.workout_plans FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout plans"
    ON public.workout_plans FOR DELETE
    USING (auth.uid() = user_id);

-- 8. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_onboarding_data_updated_at
    BEFORE UPDATE ON public.user_onboarding_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 9. TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE NO SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Usuário'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();