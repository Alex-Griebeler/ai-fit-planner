import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { isMissingColumnError, omitKeys } from "@/lib/supabaseErrors";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  gender: "female" | "male" | "other" | null;
  birth_date: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  name?: string;
  gender?: "female" | "male" | "other" | null;
  birth_date?: string | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...(data as Profile),
        birth_date: (data as { birth_date?: string | null }).birth_date ?? null,
      } as Profile;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Use upsert to create profile if it doesn't exist
      const fullPayload: Record<string, unknown> = {
        user_id: user.id,
        name: updates.name ?? query.data?.name ?? "Usuário",
        gender: updates.gender,
        birth_date: updates.birth_date,
        age: updates.age,
        height: updates.height,
        weight: updates.weight,
      };
      const fallbackPayload = omitKeys(fullPayload, ["birth_date"]);

      let result = await supabase
        .from("profiles")
        .upsert(fullPayload as never, {
          onConflict: "user_id",
        })
        .select()
        .single();

      if (isMissingColumnError(result.error, "birth_date")) {
        result = await supabase
          .from("profiles")
          .upsert(fallbackPayload as never, {
            onConflict: "user_id",
          })
          .select()
          .single();
      }

      const { data, error } = result;
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["profile", user?.id], data);
    },
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
