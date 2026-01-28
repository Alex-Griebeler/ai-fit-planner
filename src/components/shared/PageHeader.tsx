import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
  backTo?: string;
  rightContent?: React.ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  showBackButton = true,
  backTo,
  rightContent,
  className 
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header 
      className={cn(
        "sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border",
        className
      )}
    >
      <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 press-scale"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {rightContent}
        </div>
      </div>
    </header>
  );
}
