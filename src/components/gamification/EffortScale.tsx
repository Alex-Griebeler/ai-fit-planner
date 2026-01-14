import { useState } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';

interface EffortScaleProps {
  value: number;
  onChange: (value: number) => void;
}

const EFFORT_LABELS: Record<number, { label: string; emoji: string }> = {
  1: { label: 'Muito Fácil', emoji: '😴' },
  2: { label: 'Fácil', emoji: '😌' },
  3: { label: 'Leve', emoji: '🙂' },
  4: { label: 'Confortável', emoji: '😊' },
  5: { label: 'Moderado', emoji: '😐' },
  6: { label: 'Desafiador', emoji: '😤' },
  7: { label: 'Difícil', emoji: '😮‍💨' },
  8: { label: 'Intenso', emoji: '🥵' },
  9: { label: 'Muito Intenso', emoji: '😵' },
  10: { label: 'Máximo', emoji: '🔥' },
};

function getEffortColor(value: number): string {
  if (value <= 3) return 'hsl(142, 76%, 36%)'; // Green
  if (value <= 5) return 'hsl(48, 96%, 53%)'; // Yellow
  if (value <= 7) return 'hsl(25, 95%, 53%)'; // Orange
  return 'hsl(0, 72%, 51%)'; // Red
}

function getEffortGradient(value: number): string {
  if (value <= 3) return 'from-green-500 to-green-600';
  if (value <= 5) return 'from-yellow-500 to-yellow-600';
  if (value <= 7) return 'from-orange-500 to-orange-600';
  return 'from-red-500 to-red-600';
}

export function EffortScale({ value, onChange }: EffortScaleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const effortInfo = EFFORT_LABELS[value] || EFFORT_LABELS[5];
  const color = getEffortColor(value);
  const gradient = getEffortGradient(value);

  const handleValueChange = (values: number[]) => {
    onChange(values[0]);
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Label and value display */}
      <div className="text-center space-y-2">
        <motion.div
          key={value}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="text-6xl"
        >
          {effortInfo.emoji}
        </motion.div>
        <motion.div
          key={`label-${value}`}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="space-y-1"
        >
          <div 
            className={`text-4xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
          >
            {value}
          </div>
          <div className="text-lg font-medium text-foreground">
            {effortInfo.label}
          </div>
        </motion.div>
      </div>

      {/* Slider */}
      <div className="px-2">
        <Slider
          value={[value]}
          onValueChange={handleValueChange}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          min={1}
          max={10}
          step={1}
          className="cursor-pointer [&_[data-slot=range]]:transition-colors [&_[data-slot=range]]:duration-200"
          style={{
            '--effort-color': color,
          } as React.CSSProperties}
        />
        
        {/* Scale markers */}
        <div className="flex justify-between mt-2 px-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <div
              key={num}
              className={`text-xs transition-colors duration-200 ${
                num === value 
                  ? 'font-bold text-foreground' 
                  : 'text-muted-foreground'
              }`}
            >
              {num}
            </div>
          ))}
        </div>
      </div>

      {/* Color gradient bar */}
      <div className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-500 opacity-30" />
    </div>
  );
}
