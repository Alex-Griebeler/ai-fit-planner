import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useParQStatus } from '@/hooks/useParQStatus';

interface ParQGateProps {
  children: React.ReactNode;
}

export function ParQGate({ children }: ParQGateProps) {
  const location = useLocation();
  const { status, isLoading } = useParQStatus();

  if (isLoading || !status) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status.requiresAnswers || status.blocked) {
    if (location.pathname !== '/par-q') {
      return <Navigate to="/par-q" replace />;
    }
  }

  return <>{children}</>;
}
