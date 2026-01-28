import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingScreen({ 
  message, 
  className,
  size = 'md' 
}: LoadingScreenProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div 
      className={cn(
        "min-h-screen flex flex-col items-center justify-center bg-background gap-4",
        className
      )} 
      role="status" 
      aria-label={message || "Carregando"}
    >
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}
