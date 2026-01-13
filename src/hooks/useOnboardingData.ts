import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { OnboardingData, InjuryArea } from "@/types/onboarding";

export interface UserOnboardingData {
  id: string;
  user_id: string;
  goal: OnboardingData["goal"];
  timeframe: OnboardingData["timeframe"];
  training_days: string[];
  session_duration: OnboardingData["sessionDuration"];
  exercise_types: string[];
  include_cardio: boolean;
  experience_level: OnboardingData["experienceLevel"];
  variation_preference: OnboardingData["variationPreference"];
  body_areas: string[];
  has_health_conditions: boolean;
  injury_areas: string[];
  health_description: string;
  sleep_hours: string | null;
  stress_level: OnboardingData["stressLevel"];
  created_at: string;
  updated_at: string;
}

function dbToAppFormat(data: UserOnboardingData): Partial<OnboardingData> {
  return {
    goal: data.goal,
    timeframe: data.timeframe,
    trainingDays: data.training_days,
    sessionDuration: data.session_duration,
    exerciseTypes: data.exercise_types,
    includeCardio: data.include_cardio,
    experienceLevel: data.experience_level,
    variationPreference: data.variation_preference,
    bodyAreas: data.body_areas,
    hasHealthConditions: data.has_health_conditions,
    injuryAreas: (data.injury_areas || []) as InjuryArea[],
    healthDescription: data.health_description,
    sleepHours: data.sleep_hours,
    stressLevel: data.stress_level,
  };
}

function appToDbFormat(data: OnboardingData): Omit<UserOnboardingData, "id" | "user_id" | "created_at" | "updated_at"> {
  return {
    goal: data.goal,
    timeframe: data.timeframe,
    training_days: data.trainingDays,
    session_duration: data.sessionDuration,
    exercise_types: data.exerciseTypes,
    include_cardio: data.includeCardio,
    experience_level: data.experienceLevel,
    variation_preference: data.variationPreference,
    body_areas: data.bodyAreas,
    has_health_conditions: data.hasHealthConditions,
    injury_areas: data.injuryAreas,
    health_description: data.healthDescription,
    sleep_hours: data.sleepHours,
    stress_level: data.stressLevel,
  };
}

export function useOnboardingData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["onboarding-data", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_onboarding_data")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data ? dbToAppFormat(data as UserOnboardingData) : null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const saveMutation = useMutation({
    mutationFn: async (onboardingData: OnboardingData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const dbData = appToDbFormat(onboardingData);

      const { data, error } = await supabase
        .from("user_onboarding_data")
        .upsert(
          { user_id: user.id, ...dbData },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data as UserOnboardingData;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["onboarding-data", user?.id], dbToAppFormat(data));
    },
  });

  return {
    onboardingData: query.data,
    isLoading: query.isLoading,
    error: query.error,
    saveOnboardingData: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
