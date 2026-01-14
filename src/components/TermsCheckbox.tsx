import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface TermsCheckboxProps {
  accepted: boolean;
  onAcceptChange: (accepted: boolean) => void;
  error?: boolean;
  disabled?: boolean;
}

export function TermsCheckbox({ 
  accepted, 
  onAcceptChange, 
  error = false,
  disabled = false 
}: TermsCheckboxProps) {
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
      error ? "border-destructive bg-destructive/5" : "border-border bg-card/50",
      disabled && "opacity-50"
    )}>
      <Checkbox
        id="terms-checkbox"
        checked={accepted}
        onCheckedChange={(checked) => onAcceptChange(checked === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <label 
        htmlFor="terms-checkbox" 
        className={cn(
          "text-sm leading-relaxed cursor-pointer",
          error ? "text-destructive" : "text-muted-foreground"
        )}
      >
        Li e aceito os{' '}
        <Link 
          to="/termos" 
          target="_blank"
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          Termos de Uso
        </Link>
        {' '}e a{' '}
        <Link 
          to="/privacidade" 
          target="_blank"
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          Política de Privacidade
        </Link>
      </label>
    </div>
  );
}
