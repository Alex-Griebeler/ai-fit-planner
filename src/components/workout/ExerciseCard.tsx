import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Dumbbell, Info, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { WorkoutExercise } from '@/types/workout';

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  completedSets: number;
  onSetComplete: (setNumber: number) => void;
  onSetUndo: (setNumber: number) => void;
  load?: string;
  onLoadChange?: (value: string) => void;
  isActive?: boolean;
  onSelect?: () => void;
  onCompleteExercise?: () => void;
  onStartTimer?: () => void;
  restTime?: string;
}

export function ExerciseCard({
  exercise,
  completedSets,
  onSetComplete,
  onSetUndo,
  load,
  onLoadChange,
  isActive = false,
  onSelect,
  onCompleteExercise,
  onStartTimer,
  restTime,
}: ExerciseCardProps) {
  const [showLoadInput, setShowLoadInput] = useState(false);
  const [showSeriesButtons, setShowSeriesButtons] = useState(false);
  const allSetsComplete = completedSets >= exercise.sets;

  const handleSetClick = (setIndex: number) => {
    if (setIndex < completedSets) {
      onSetUndo(setIndex);
    } else if (setIndex === completedSets) {
      onSetComplete(setIndex);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border transition-all duration-200",
        isActive 
          ? "border-primary bg-primary/5 shadow-lg" 
          : allSetsComplete 
            ? "border-green-500/30 bg-green-500/5" 
            : "border-border bg-card"
      )}
    >
      <button
        onClick={onSelect}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                #{exercise.order}
              </span>
              {exercise.method && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {exercise.method}
                </span>
              )}
            </div>
            
            <h3 className={cn(
              "font-semibold mt-1 line-clamp-2",
              allSetsComplete && "text-green-600 dark:text-green-400"
            )}>
              {exercise.name}
            </h3>
            
            <p className="text-sm text-muted-foreground mt-0.5">
              {exercise.equipment}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {allSetsComplete && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"
              >
                <Check className="w-5 h-5 text-white" />
              </motion.div>
            )}
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  aria-label={`Ver detalhes de ${exercise.name}`}
                >
                  <Info className="w-4 h-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2 text-sm">
                  <p><strong>Séries:</strong> {exercise.sets}</p>
                  <p><strong>Reps:</strong> {exercise.reps}</p>
                  <p><strong>Descanso:</strong> {exercise.rest}</p>
                  {exercise.intensity && (
                    <p><strong>Intensidade:</strong> {exercise.intensity}</p>
                  )}
                  {exercise.tempo && (
                    <p><strong>Tempo:</strong> {exercise.tempo}</p>
                  )}
                  {exercise.notes && (
                    <p className="text-muted-foreground">{exercise.notes}</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Prescription row */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span className="font-mono text-muted-foreground">
            {exercise.sets} × {exercise.reps}
          </span>
          <span className="text-muted-foreground">
            ⏱️ {exercise.rest}
          </span>
          {exercise.intensity && (
            <span className="text-muted-foreground">
              💪 {exercise.intensity}
            </span>
          )}
        </div>
      </button>

      {/* Expanded content when active */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-border/50">
              {/* Progress indicator */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  {completedSets}/{exercise.sets} séries
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: exercise.sets }).map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        idx < completedSets ? "bg-green-500" : "bg-muted"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Main action button - Complete Exercise */}
              {!allSetsComplete && (
                <Button
                  size="lg"
                  className="w-full h-12 rounded-xl mb-3 press-scale"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompleteExercise?.();
                  }}
                >
                  <Check className="w-5 h-5 mr-2" />
                  Completar Exercício
                </Button>
              )}

              {/* Secondary actions row */}
              <div className="flex gap-2">
                {/* Timer button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10 rounded-xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartTimer?.();
                  }}
                >
                  <Timer className="w-4 h-4 mr-1.5" />
                  Timer {restTime || exercise.rest}
                </Button>

                {/* Load input toggle */}
                {showLoadInput ? (
                  <div className="flex-1 flex gap-2">
                    <Input
                      type="text"
                      placeholder="Ex: 20kg"
                      value={load || ''}
                      onChange={(e) => onLoadChange?.(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 h-10"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLoadInput(false);
                      }}
                    >
                      OK
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 rounded-xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLoadInput(true);
                    }}
                  >
                    <Dumbbell className="w-4 h-4 mr-1.5" />
                    {load || 'Carga'}
                  </Button>
                )}
              </div>

              {/* Collapsible series buttons - advanced option */}
              <Collapsible open={showSeriesButtons} onOpenChange={setShowSeriesButtons}>
                <CollapsibleTrigger
                  className="w-full mt-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {showSeriesButtons ? '▲ Ocultar séries individuais' : '▼ Marcar série a série'}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.from({ length: exercise.sets }).map((_, index) => {
                      const isCompleted = index < completedSets;
                      const isCurrent = index === completedSets;
                      
                      return (
                        <motion.button
                          key={index}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetClick(index);
                          }}
                          className={cn(
                            "h-12 w-12 rounded-xl font-semibold text-sm transition-all duration-200",
                            isCompleted
                              ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                              : isCurrent
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isCompleted ? (
                            <Check className="w-5 h-5 mx-auto" />
                          ) : (
                            `S${index + 1}`
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
