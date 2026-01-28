import { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { PasswordValidation } from '@/hooks/usePasswordValidation';

interface PasswordStrengthIndicatorProps {
  validation: PasswordValidation;
  show: boolean;
}

const requirements = [
  { key: 'hasMinLength' as const, label: 'Mínimo 8 caracteres' },
  { key: 'hasUppercase' as const, label: 'Uma letra maiúscula (A-Z)' },
  { key: 'hasLowercase' as const, label: 'Uma letra minúscula (a-z)' },
  { key: 'hasNumber' as const, label: 'Um número (0-9)' },
  { key: 'hasSymbol' as const, label: 'Um símbolo (!@#$%...)' },
];

const PasswordStrengthContent = forwardRef<HTMLDivElement, { validation: PasswordValidation }>(
  ({ validation }, ref) => {
    const strengthColors = {
      weak: 'bg-destructive',
      medium: 'bg-yellow-500',
      strong: 'bg-green-500',
    };

    const strengthLabels = {
      weak: 'Fraca',
      medium: 'Média',
      strong: 'Forte',
    };

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="mt-3 p-4 rounded-lg bg-muted/50 border border-border space-y-3">
          {/* Strength bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Força da senha</span>
              <span className={`font-medium ${
                validation.strength === 'weak' ? 'text-destructive' :
                validation.strength === 'medium' ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {strengthLabels[validation.strength]}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${strengthColors[validation.strength]}`}
                initial={{ width: 0 }}
                animate={{ width: `${validation.strengthPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Requirements list */}
          <ul className="space-y-1.5">
            {requirements.map(({ key, label }) => {
              const passed = validation[key];
              return (
                <motion.li
                  key={key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-xs"
                >
                  {passed ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className={passed ? 'text-foreground' : 'text-muted-foreground'}>
                    {label}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </motion.div>
    );
  }
);

PasswordStrengthContent.displayName = 'PasswordStrengthContent';

export function PasswordStrengthIndicator({ validation, show }: PasswordStrengthIndicatorProps) {
  return (
    <AnimatePresence>
      {show && <PasswordStrengthContent validation={validation} />}
    </AnimatePresence>
  );
}
