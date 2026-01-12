import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BodySelectorProps {
  selectedAreas: string[];
  onChange: (areas: string[]) => void;
}

const bodyAreas = [
  { key: 'chest', label: 'Peitoral', top: '22%', left: '50%' },
  { key: 'shoulders', label: 'Ombros', top: '16%', left: '50%' },
  { key: 'arms', label: 'Braços', top: '30%', left: '25%' },
  { key: 'core', label: 'Core', top: '38%', left: '50%' },
  { key: 'back', label: 'Costas', top: '28%', left: '75%' },
  { key: 'glutes', label: 'Glúteos', top: '50%', left: '50%' },
  { key: 'legs', label: 'Pernas', top: '68%', left: '50%' },
];

export function BodySelector({ selectedAreas, onChange }: BodySelectorProps) {
  const toggleArea = (area: string) => {
    if (selectedAreas.includes(area)) {
      onChange(selectedAreas.filter((a) => a !== area));
    } else {
      onChange([...selectedAreas, area]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Body silhouette area */}
      <div className="relative aspect-[3/4] max-w-[280px] mx-auto">
        {/* Body shape background */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 100 140"
            className="w-full h-full text-secondary"
            fill="currentColor"
          >
            {/* Simplified body silhouette */}
            <ellipse cx="50" cy="12" rx="12" ry="12" /> {/* Head */}
            <rect x="46" y="24" width="8" height="8" rx="2" /> {/* Neck */}
            <path
              d="M30 32 Q50 28 70 32 L75 55 Q75 70 65 75 L60 100 Q60 110 55 130 L45 130 Q40 110 40 100 L35 75 Q25 70 25 55 Z"
              opacity="0.5"
            /> {/* Body */}
          </svg>
        </div>

        {/* Interactive points */}
        {bodyAreas.map((area, index) => {
          const isSelected = selectedAreas.includes(area.key);
          return (
            <motion.button
              key={area.key}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => toggleArea(area.key)}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full',
                'flex items-center justify-center transition-all duration-200',
                'border-2',
                isSelected
                  ? 'gradient-primary border-primary shadow-glow scale-110'
                  : 'bg-card border-border hover:border-primary/50 hover:scale-105'
              )}
              style={{ top: area.top, left: area.left }}
            >
              <span className="sr-only">{area.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Selected areas list */}
      {selectedAreas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 justify-center"
        >
          {bodyAreas
            .filter((a) => selectedAreas.includes(a.key))
            .map((area) => (
              <span
                key={area.key}
                className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium"
              >
                {area.label}
              </span>
            ))}
        </motion.div>
      )}

      <p className="text-center text-muted-foreground text-sm">
        Toque nas áreas que deseja focar
      </p>
    </div>
  );
}
