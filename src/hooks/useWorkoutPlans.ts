import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Json } from "@/integrations/supabase/types";

export interface WorkoutPlan {
  id: string;
  user_id: string;
  plan_name: string;
  description: string | null;
  weekly_frequency: number;
  session_duration: string;
  periodization: string | null;
  plan_data: Json;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface CreateWorkoutPlanInput {
  plan_name: string;
  description?: string;
  weekly_frequency: number;
  session_duration: string;
  periodization?: string;
  plan_data: Json;
  expires_at?: string;
}

export function useWorkoutPlans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar todos os planos do usuário
  const allPlansQuery = useQuery({
    queryKey: ["workout-plans", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WorkoutPlan[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 segundos para melhor sincronização
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Buscar plano ativo
  const activePlanQuery = useQuery({
    queryKey: ["workout-plans", user?.id, "active"],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data as WorkoutPlan | null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 segundos para melhor sincronização
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Criar novo plano
  const createMutation = useMutation({
    mutationFn: async (input: CreateWorkoutPlanInput) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Desativa planos anteriores
      await supabase
        .from("workout_plans")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("is_active", true);

      // Cria novo plano ativo
      const { data, error } = await supabase
        .from("workout_plans")
        .insert([{
          user_id: user.id,
          plan_name: input.plan_name,
          description: input.description ?? null,
          weekly_frequency: input.weekly_frequency,
          session_duration: input.session_duration,
          periodization: input.periodization ?? null,
          plan_data: input.plan_data,
          is_active: true,
          expires_at: input.expires_at ?? null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as WorkoutPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans", user?.id] });
    },
  });

  // Desativar plano
  const deactivateMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("workout_plans")
        .update({ is_active: false })
        .eq("id", planId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans", user?.id] });
    },
  });

  // Deletar plano
  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("workout_plans")
        .delete()
        .eq("id", planId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-plans", user?.id] });
    },
  });

  // Função para forçar refetch dos planos
  const refetchPlans = async () => {
    await queryClient.invalidateQueries({ queryKey: ["workout-plans", user?.id] });
  };

  return {
    plans: allPlansQuery.data ?? [],
    activePlan: activePlanQuery.data,
    isLoading: allPlansQuery.isLoading || activePlanQuery.isLoading,
    error: allPlansQuery.error || activePlanQuery.error,
    createPlan: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deactivatePlan: deactivateMutation.mutateAsync,
    deletePlan: deleteMutation.mutateAsync,
    refetchPlans,
  };
}
