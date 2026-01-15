export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      exercise_loads: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          load_value: string
          updated_at: string
          user_id: string
          workout_day: string
          workout_plan_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          load_value: string
          updated_at?: string
          user_id: string
          workout_day: string
          workout_plan_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          load_value?: string
          updated_at?: string
          user_id?: string
          workout_day?: string
          workout_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_loads_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          equipment: string | null
          force_vector: string | null
          id: string
          joint_action: string | null
          joint_type: string | null
          kinetic_chain: string | null
          movement_pattern: string | null
          muscle_group: string
          name: string
          training_level: string
        }
        Insert: {
          created_at?: string
          equipment?: string | null
          force_vector?: string | null
          id?: string
          joint_action?: string | null
          joint_type?: string | null
          kinetic_chain?: string | null
          movement_pattern?: string | null
          muscle_group: string
          name: string
          training_level: string
        }
        Update: {
          created_at?: string
          equipment?: string | null
          force_vector?: string | null
          id?: string
          joint_action?: string | null
          joint_type?: string | null
          kinetic_chain?: string | null
          movement_pattern?: string | null
          muscle_group?: string
          name?: string
          training_level?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          achievement_alerts: boolean
          created_at: string
          id: string
          reminder_time: string
          streak_warnings: boolean
          updated_at: string
          user_id: string
          workout_reminders: boolean
        }
        Insert: {
          achievement_alerts?: boolean
          created_at?: string
          id?: string
          reminder_time?: string
          streak_warnings?: boolean
          updated_at?: string
          user_id: string
          workout_reminders?: boolean
        }
        Update: {
          achievement_alerts?: boolean
          created_at?: string
          id?: string
          reminder_time?: string
          streak_warnings?: boolean
          updated_at?: string
          user_id?: string
          workout_reminders?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      prescription_feedback: {
        Row: {
          completed_sets: number
          created_at: string
          difficulty_rating: string | null
          exercise_name: string
          exercise_rpe: number | null
          id: string
          load_used: string | null
          notes: string | null
          prescribed_reps: string | null
          prescribed_sets: number
          updated_at: string
          user_id: string
          workout_day: string
          workout_plan_id: string | null
          workout_session_id: string | null
        }
        Insert: {
          completed_sets?: number
          created_at?: string
          difficulty_rating?: string | null
          exercise_name: string
          exercise_rpe?: number | null
          id?: string
          load_used?: string | null
          notes?: string | null
          prescribed_reps?: string | null
          prescribed_sets: number
          updated_at?: string
          user_id: string
          workout_day: string
          workout_plan_id?: string | null
          workout_session_id?: string | null
        }
        Update: {
          completed_sets?: number
          created_at?: string
          difficulty_rating?: string | null
          exercise_name?: string
          exercise_rpe?: number | null
          id?: string
          load_used?: string | null
          notes?: string | null
          prescribed_reps?: string | null
          prescribed_sets?: number
          updated_at?: string
          user_id?: string
          workout_day?: string
          workout_plan_id?: string | null
          workout_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_feedback_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_feedback_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string
          gender: string | null
          height: number | null
          id: string
          name: string
          privacy_accepted_at: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          gender?: string | null
          height?: number | null
          id?: string
          name: string
          privacy_accepted_at?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string
          gender?: string | null
          height?: number | null
          id?: string
          name?: string
          privacy_accepted_at?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_hour: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          user_id: string
          window_hour: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_hour?: string
          window_start?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_key: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding_data: {
        Row: {
          body_areas: string[] | null
          cardio_timing: string | null
          created_at: string
          exercise_types: string[] | null
          experience_level: string | null
          goal: string | null
          has_health_conditions: boolean | null
          health_description: string | null
          id: string
          include_cardio: boolean | null
          injury_areas: string[] | null
          session_duration: string | null
          sleep_hours: string | null
          split_preference: string | null
          stress_level: string | null
          timeframe: string | null
          training_days: string[] | null
          updated_at: string
          user_id: string
          variation_preference: string | null
        }
        Insert: {
          body_areas?: string[] | null
          cardio_timing?: string | null
          created_at?: string
          exercise_types?: string[] | null
          experience_level?: string | null
          goal?: string | null
          has_health_conditions?: boolean | null
          health_description?: string | null
          id?: string
          include_cardio?: boolean | null
          injury_areas?: string[] | null
          session_duration?: string | null
          sleep_hours?: string | null
          split_preference?: string | null
          stress_level?: string | null
          timeframe?: string | null
          training_days?: string[] | null
          updated_at?: string
          user_id: string
          variation_preference?: string | null
        }
        Update: {
          body_areas?: string[] | null
          cardio_timing?: string | null
          created_at?: string
          exercise_types?: string[] | null
          experience_level?: string | null
          goal?: string | null
          has_health_conditions?: boolean | null
          health_description?: string | null
          id?: string
          include_cardio?: boolean | null
          injury_areas?: string[] | null
          session_duration?: string | null
          sleep_hours?: string | null
          split_preference?: string | null
          stress_level?: string | null
          timeframe?: string | null
          training_days?: string[] | null
          updated_at?: string
          user_id?: string
          variation_preference?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_workout_date: string | null
          longest_streak: number
          streak_freezes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_workout_date?: string | null
          longest_streak?: number
          streak_freezes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_workout_date?: string | null
          longest_streak?: number
          streak_freezes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_plans: {
        Row: {
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          periodization: string | null
          plan_data: Json
          plan_name: string
          session_duration: string
          user_id: string
          weekly_frequency: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          periodization?: string | null
          plan_data: Json
          plan_name: string
          session_duration: string
          user_id: string
          weekly_frequency: number
        }
        Update: {
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          periodization?: string | null
          plan_data?: Json
          plan_name?: string
          session_duration?: string
          user_id?: string
          weekly_frequency?: number
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          completed_at: string | null
          completed_sets: number
          created_at: string
          duration_minutes: number | null
          exercises_data: Json | null
          id: string
          perceived_effort: number | null
          session_notes: string | null
          started_at: string
          status: string
          total_sets: number
          user_id: string
          workout_day: string
          workout_name: string
          workout_plan_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_sets?: number
          created_at?: string
          duration_minutes?: number | null
          exercises_data?: Json | null
          id?: string
          perceived_effort?: number | null
          session_notes?: string | null
          started_at?: string
          status?: string
          total_sets?: number
          user_id: string
          workout_day: string
          workout_name: string
          workout_plan_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_sets?: number
          created_at?: string
          duration_minutes?: number | null
          exercises_data?: Json | null
          id?: string
          perceived_effort?: number | null
          session_notes?: string | null
          started_at?: string
          status?: string
          total_sets?: number
          user_id?: string
          workout_day?: string
          workout_name?: string
          workout_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests?: number
          p_user_id: string
          p_window_hours?: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          remaining: number
          reset_at: string
        }[]
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
