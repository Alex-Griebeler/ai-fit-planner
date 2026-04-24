import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { OnboardingData, InjuryArea, CardioTiming } from "@/types/onboarding";
import { normalizeTrainingDays } from "@/lib/trainingDays";
import { goalsFromLegacy, normalizeGoals, primaryGoalFromGoals } from "@/lib/goals";

export interface UserOnboardingData {
  id: string;
  user_id: string;
  goal: OnboardingData["goal"];
  goals?: string[] | null;
  timeframe: OnboardingData["timeframe"];
  training_days: string[];
  session_duration: OnboardingData["sessionDuration"];
  exercise_types: string[];
  include_cardio: boolean;
  cardio_timing: CardioTiming | null;
  experience_level: OnboardingData["experienceLevel"];
  split_preference: OnboardingData["splitPreference"];
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
  const normalizedGoals = goalsFromLegacy(data.goal, data.goals);
  const normalizedDuration = data.session_duration === '60plus' ? '60min' : data.session_duration;
  return {
    goal: primaryGoalFromGoals(normalizedGoals),
    goals: normalizedGoals,
    timeframe: data.timeframe,
    trainingDays: normalizeTrainingDays(data.training_days),
    sessionDuration: normalizedDuration,
    exerciseTypes: data.exercise_types,
    includeCardio: data.include_cardio,
    cardioTiming: data.cardio_timing,
    experienceLevel: data.experience_level,
    splitPreference: data.split_preference,
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
  const normalizedGoals = normalizeGoals(data.goals);
  const normalizedDuration = data.sessionDuration === '60plus' ? '60min' : data.sessionDuration;
  return {
    goal: primaryGoalFromGoals(normalizedGoals) ?? data.goal,
    goals: normalizedGoals,
    timeframe: data.timeframe,
    training_days: normalizeTrainingDays(data.trainingDays),
    session_duration: normalizedDuration,
    exercise_types: data.exerciseTypes,
    include_cardio: data.includeCardio,
    cardio_timing: data.cardioTiming,
    experience_level: data.experienceLevel,
    split_preference: data.splitPreference,
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

      const fullPayload = { user_id: user.id, ...dbData };
      const fallbackPayload = { ...fullPayload, goals: undefined };

      let result = await supabase
        .from("user_onboarding_data")
        .upsert(
          fullPayload as never,
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (result.error?.message?.includes('column "goals"') || result.error?.message?.includes("goals does not exist")) {
        result = await supabase
          .from("user_onboarding_data")
          .upsert(
            fallbackPayload as never,
            { onConflict: "user_id" }
          )
          .select()
          .single();
      }

      const { data, error } = result;

      if (error) throw error;
      return data as UserOnboardingData;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["onboarding-data", user?.id], dbToAppFormat(data));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (partialData: Partial<OnboardingData>) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Build update object with only provided fields
      const updateFields: Record<string, unknown> = {};
      
      if (partialData.goal !== undefined) updateFields.goal = partialData.goal;
      if (partialData.goals !== undefined) {
        const normalizedGoals = normalizeGoals(partialData.goals);
        updateFields.goals = normalizedGoals;
        updateFields.goal = primaryGoalFromGoals(normalizedGoals);
      }
      if (partialData.timeframe !== undefined) updateFields.timeframe = partialData.timeframe;
      if (partialData.trainingDays !== undefined) updateFields.training_days = normalizeTrainingDays(partialData.trainingDays);
      if (partialData.sessionDuration !== undefined) {
        updateFields.session_duration = partialData.sessionDuration === '60plus'
          ? '60min'
          : partialData.sessionDuration;
      }
      if (partialData.exerciseTypes !== undefined) updateFields.exercise_types = partialData.exerciseTypes;
      if (partialData.includeCardio !== undefined) updateFields.include_cardio = partialData.includeCardio;
      if (partialData.cardioTiming !== undefined) updateFields.cardio_timing = partialData.cardioTiming;
      if (partialData.splitPreference !== undefined) updateFields.split_preference = partialData.splitPreference;
      if (partialData.experienceLevel !== undefined) updateFields.experience_level = partialData.experienceLevel;
      if (partialData.variationPreference !== undefined) updateFields.variation_preference = partialData.variationPreference;
      if (partialData.bodyAreas !== undefined) updateFields.body_areas = partialData.bodyAreas;
      if (partialData.hasHealthConditions !== undefined) updateFields.has_health_conditions = partialData.hasHealthConditions;
      if (partialData.injuryAreas !== undefined) updateFields.injury_areas = partialData.injuryAreas;
      if (partialData.healthDescription !== undefined) updateFields.health_description = partialData.healthDescription;
      if (partialData.sleepHours !== undefined) updateFields.sleep_hours = partialData.sleepHours;
      if (partialData.stressLevel !== undefined) updateFields.stress_level = partialData.stressLevel;

      const fullPayload = { user_id: user.id, ...updateFields };
      const fallbackPayload = { ...fullPayload, goals: undefined };

      let result = await supabase
        .from("user_onboarding_data")
        .upsert(
          fullPayload as never,
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (result.error?.message?.includes('column "goals"') || result.error?.message?.includes("goals does not exist")) {
        result = await supabase
          .from("user_onboarding_data")
          .upsert(
            fallbackPayload as never,
            { onConflict: "user_id" }
          )
          .select()
          .single();
      }

      const { data, error } = result;

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
    updateOnboardingData: updateMutation.mutateAsync,
    isSaving: saveMutation.isPending || updateMutation.isPending,
  };
}
