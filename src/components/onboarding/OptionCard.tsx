import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function OptionCard({
  title,
  description,
  icon,
  selected,
  onClick,
  disabled = false,
}: OptionCardProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full p-4 rounded-xl border-2 transition-all duration-200 text-left',
        'flex items-center gap-4',
        selected
          ? 'border-primary bg-primary/10 shadow-glow'
          : 'border-border bg-card hover:border-primary/50 hover:bg-card/80',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {icon && (
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
            selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
          selected
            ? 'border-primary bg-primary'
            : 'border-muted-foreground/30'
        )}
      >
        {selected && <Check className="w-4 h-4 text-primary-foreground" />}
      </div>
    </motion.button>
  );
}
