import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RestTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
  autoStart?: boolean;
}

export function RestTimer({ initialSeconds, onComplete, autoStart = false }: RestTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isComplete, setIsComplete] = useState(false);

  const progress = ((initialSeconds - seconds) / initialSeconds) * 100;

  useEffect(() => {
    setSeconds(initialSeconds);
    setIsComplete(false);
    if (autoStart) {
      setIsRunning(true);
    }
  }, [initialSeconds, autoStart]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, seconds, onComplete]);

  const toggleTimer = useCallback(() => {
    if (isComplete) {
      setSeconds(initialSeconds);
      setIsComplete(false);
      setIsRunning(true);
    } else {
      setIsRunning((prev) => !prev);
    }
  }, [isComplete, initialSeconds]);

  const resetTimer = useCallback(() => {
    setSeconds(initialSeconds);
    setIsRunning(false);
    setIsComplete(false);
  }, [initialSeconds]);

  const adjustTime = useCallback((amount: number) => {
    setSeconds((prev) => Math.max(0, prev + amount));
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4"
    >
      {/* Circular Progress */}
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r="58"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted"
          />
          {/* Progress circle */}
          <motion.circle
            cx="64"
            cy="64"
            r="58"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            className={isComplete ? "text-green-500" : "text-primary"}
            strokeDasharray={364.4}
            strokeDashoffset={364.4 - (364.4 * progress) / 100}
            initial={false}
            animate={{ strokeDashoffset: 364.4 - (364.4 * progress) / 100 }}
            transition={{ duration: 0.3 }}
          />
        </svg>
        
        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={seconds}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`text-3xl font-bold tabular-nums ${isComplete ? 'text-green-500' : 'text-foreground'}`}
            >
              {isComplete ? '✓' : formatTime(seconds)}
            </motion.span>
          </AnimatePresence>
          {!isComplete && (
            <span className="text-xs text-muted-foreground mt-1">
              {isRunning ? 'Descansando' : 'Pausado'}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => adjustTime(-15)}
          disabled={seconds <= 0}
        >
          <Minus className="w-4 h-4" />
        </Button>

        <Button
          size="icon"
          className="h-14 w-14 rounded-full"
          onClick={toggleTimer}
        >
          {isComplete ? (
            <RotateCcw className="w-6 h-6" />
          ) : isRunning ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => adjustTime(15)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick reset */}
      {(isRunning || seconds !== initialSeconds) && !isComplete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetTimer}
          className="text-muted-foreground"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reiniciar
        </Button>
      )}
    </motion.div>
  );
}
