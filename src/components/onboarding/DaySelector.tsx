import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DaySelectorProps {
  selectedDays: string[];
  onChange: (days: string[]) => void;
}

const days = [
  { key: 'mon', label: 'S', fullLabel: 'Segunda' },
  { key: 'tue', label: 'T', fullLabel: 'Terça' },
  { key: 'wed', label: 'Q', fullLabel: 'Quarta' },
  { key: 'thu', label: 'Q', fullLabel: 'Quinta' },
  { key: 'fri', label: 'S', fullLabel: 'Sexta' },
  { key: 'sat', label: 'S', fullLabel: 'Sábado' },
  { key: 'sun', label: 'D', fullLabel: 'Domingo' },
];

const VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function DaySelector({ selectedDays, onChange }: DaySelectorProps) {
  const toggleDay = (day: string) => {
    const currentSet = new Set(selectedDays.filter(d => VALID_DAYS.includes(d)));
    if (currentSet.has(day)) {
      currentSet.delete(day);
    } else {
      currentSet.add(day);
    }
    onChange([...currentSet]);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-between">
        {days.map((day, index) => {
          const isSelected = selectedDays.includes(day.key);
          return (
            <motion.button
              key={day.key}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleDay(day.key)}
              className={cn(
                'w-11 h-11 md:w-12 md:h-12 rounded-xl font-bold text-sm transition-all duration-200',
                isSelected
                  ? 'gradient-primary text-primary-foreground shadow-glow'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              )}
            >
              {day.label}
            </motion.button>
          );
        })}
      </div>

      {selectedDays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          {days
            .filter((d) => selectedDays.includes(d.key))
            .map((day) => (
              <span
                key={day.key}
                className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium"
              >
                {day.fullLabel}
              </span>
            ))}
        </motion.div>
      )}

      <p className="text-center text-muted-foreground text-sm">
        {selectedDays.length} {selectedDays.length === 1 ? 'dia selecionado' : 'dias selecionados'}
      </p>
    </div>
  );
}
