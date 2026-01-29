import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, ChevronDown, ChevronRight, Trophy, Target, Flame } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useWorkoutSessions } from '@/hooks/useWorkoutSessions';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';

export function ProgressPreviewCard() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { sessions, isLoading } = useWorkoutSessions();
  const metrics = usePerformanceMetrics(sessions, 3);

  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-card border-border">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Seu Progresso</CardTitle>
              </div>
              <ChevronDown 
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`} 
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-3">
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                  <Trophy className="w-4 h-4 text-yellow-500 mb-1" />
                  <span className="text-lg font-bold text-foreground">
                    {isLoading ? '-' : metrics.workoutsThisWeek}
                  </span>
                  <span className="text-xs text-muted-foreground">Esta semana</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                  <Target className="w-4 h-4 text-primary mb-1" />
                  <span className="text-lg font-bold text-foreground">
                    {isLoading ? '-' : `${metrics.completionRate}%`}
                  </span>
                  <span className="text-xs text-muted-foreground">Conclusão</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                  <Flame className="w-4 h-4 text-orange-500 mb-1" />
                  <span className="text-lg font-bold text-foreground">
                    {isLoading ? '-' : completedSessions}
                  </span>
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
              </div>

              {/* CTA */}
              <Button 
                variant="outline"
                className="w-full h-10"
                onClick={() => navigate('/progress')}
              >
                Ver detalhes completos
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
