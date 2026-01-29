import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Dumbbell, CheckCircle2, XCircle, Calendar, Trash2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { WorkoutSession } from '@/hooks/useWorkoutSessions';

interface SessionHistoryCardProps {
  sessions: WorkoutSession[];
  isLoading: boolean;
  onDeleteSession?: (sessionId: string) => Promise<void>;
}

export function SessionHistoryCard({ sessions, isLoading, onDeleteSession }: SessionHistoryCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Histórico de Treinos
            </CardTitle>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  const recentSessions = sessions.slice(0, 5);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Histórico de Treinos
                {recentSessions.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    {recentSessions.length}
                  </Badge>
                )}
              </CardTitle>
              <ChevronDown 
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`} 
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            {recentSessions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum treino registrado</p>
              </div>
            ) : (
              recentSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
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

                  <div className="flex items-center gap-2">
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

                    {onDeleteSession && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive focus-ring"
                            aria-label="Excluir sessão"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir treino do histórico?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir "{session.workout_name}" do histórico? 
                              <span className="block mt-2 font-medium text-destructive">
                                Essa ação não poderá ser desfeita.
                              </span>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeleteSession(session.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
