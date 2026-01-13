import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Dumbbell, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { WorkoutSession } from '@/hooks/useWorkoutSessions';

interface SessionHistoryCardProps {
  sessions: WorkoutSession[];
  isLoading: boolean;
}

export function SessionHistoryCard({ sessions, isLoading }: SessionHistoryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Histórico de Treinos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const recentSessions = sessions.slice(0, 5);

  if (recentSessions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Histórico de Treinos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum treino registrado ainda</p>
            <p className="text-sm">Comece seu primeiro treino!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Histórico de Treinos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentSessions.map((session, index) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
          >
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${session.status === 'completed' 
                ? 'bg-green-500/20 text-green-500' 
                : 'bg-destructive/20 text-destructive'}
            `}>
              {session.status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {session.workout_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(session.started_at), { 
                  addSuffix: true,
                  locale: ptBR 
                })}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <Badge 
                variant={session.status === 'completed' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {session.status === 'completed' ? 'Completo' : 'Abandonado'}
              </Badge>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {session.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {session.duration_minutes}min
                  </span>
                )}
                <span>
                  {session.completed_sets}/{session.total_sets} séries
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
