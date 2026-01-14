import { useState } from 'react';
import { Bell, BellOff, Dumbbell, Trophy, Flame, Clock, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

export function NotificationSection() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const {
    preferences,
    isLoading: prefsLoading,
    isSaving,
    savePreferences,
  } = useNotificationPreferences();

  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    await sendTestNotification();
    setIsSendingTest(false);
  };

  const isLoading = pushLoading || prefsLoading;

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push. Tente usar Chrome, Firefox ou Edge.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main notification toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Receba lembretes de treino e alertas de conquistas mesmo com o app fechado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-toggle" className="text-base font-medium">
                Ativar notificações
              </Label>
              <p className="text-sm text-muted-foreground">
                {permission === 'denied' 
                  ? 'Permissão negada. Altere nas configurações do navegador.'
                  : isSubscribed 
                    ? 'Você receberá notificações push' 
                    : 'Ative para receber lembretes'}
              </p>
            </div>
            <Switch
              id="push-toggle"
              checked={isSubscribed}
              onCheckedChange={handleToggleNotifications}
              disabled={isLoading || permission === 'denied'}
            />
          </div>

          {isSubscribed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTest}
              disabled={isSendingTest}
              className="w-full"
            >
              {isSendingTest ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar Notificação de Teste
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Notification preferences */}
      {isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle>Preferências</CardTitle>
            <CardDescription>
              Escolha quais tipos de notificações você deseja receber.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Workout reminders */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <Label htmlFor="workout-reminders" className="text-base font-medium">
                    Lembretes de Treino
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receba um lembrete quando tiver treino programado
                  </p>
                </div>
              </div>
              <Switch
                id="workout-reminders"
                checked={preferences.workout_reminders}
                onCheckedChange={(checked) => savePreferences({ workout_reminders: checked })}
                disabled={isSaving}
              />
            </div>

            {/* Achievement alerts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <Label htmlFor="achievement-alerts" className="text-base font-medium">
                    Alertas de Conquistas
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Seja notificado quando desbloquear uma conquista
                  </p>
                </div>
              </div>
              <Switch
                id="achievement-alerts"
                checked={preferences.achievement_alerts}
                onCheckedChange={(checked) => savePreferences({ achievement_alerts: checked })}
                disabled={isSaving}
              />
            </div>

            {/* Streak warnings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <Label htmlFor="streak-warnings" className="text-base font-medium">
                    Alertas de Sequência
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receba um alerta se estiver prestes a perder sua sequência
                  </p>
                </div>
              </div>
              <Switch
                id="streak-warnings"
                checked={preferences.streak_warnings}
                onCheckedChange={(checked) => savePreferences({ streak_warnings: checked })}
                disabled={isSaving}
              />
            </div>

            {/* Reminder time */}
            {preferences.workout_reminders && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <Label htmlFor="reminder-time" className="text-base font-medium">
                      Horário do Lembrete
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Quando você quer receber o lembrete diário
                    </p>
                  </div>
                </div>
                <Input
                  id="reminder-time"
                  type="time"
                  value={preferences.reminder_time.slice(0, 5)}
                  onChange={(e) => savePreferences({ reminder_time: e.target.value + ':00' })}
                  className="w-28"
                  disabled={isSaving}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
