import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NotificationPreferences {
  workout_reminders: boolean;
  achievement_alerts: boolean;
  streak_warnings: boolean;
  reminder_time: string;
}

const defaultPreferences: NotificationPreferences = {
  workout_reminders: true,
  achievement_alerts: true,
  streak_warnings: true,
  reminder_time: '08:00:00',
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('workout_reminders, achievement_alerts, streak_warnings, reminder_time')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          workout_reminders: data.workout_reminders,
          achievement_alerts: data.achievement_alerts,
          streak_warnings: data.streak_warnings,
          reminder_time: data.reminder_time,
        });
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Save preferences
  const savePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user) return false;

    setIsSaving(true);

    try {
      const updatedPreferences = { ...preferences, ...newPreferences };

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...updatedPreferences,
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setPreferences(updatedPreferences);
      toast.success('Preferências salvas!');
      return true;
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error('Erro ao salvar preferências');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, preferences]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    isSaving,
    savePreferences,
    refetch: fetchPreferences,
  };
}
