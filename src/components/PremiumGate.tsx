import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

interface PremiumGateProps {
  children: ReactNode;
  feature?: string;
  showPreview?: boolean;
}

export function PremiumGate({ 
  children, 
  feature = 'Esta funcionalidade',
  showPreview = false 
}: PremiumGateProps) {
  const { isPremium, isLoading, createCheckout } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {showPreview && (
        <div className="pointer-events-none opacity-30 blur-sm">
          {children}
        </div>
      )}
      
      <div className={`${showPreview ? 'absolute inset-0' : ''} flex items-center justify-center`}>
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md mx-auto text-center shadow-lg">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Crown className="w-8 h-8 text-white" />
          </motion.div>

          <h3 className="text-xl font-bold text-foreground mb-2">
            Recurso Premium
          </h3>
          
          <p className="text-muted-foreground mb-6">
            {feature} está disponível apenas para assinantes Premium. 
            Faça upgrade agora e desbloqueie todos os recursos!
          </p>

          <div className="space-y-3">
            <Button 
              onClick={createCheckout}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
              size="lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Fazer Upgrade - R$ 29,90/mês
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              <span>Pagamento seguro via Stripe</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground mb-3">
              Incluído no Premium:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Gráficos de evolução de cargas</li>
              <li>✓ Histórico completo de treinos</li>
              <li>✓ Análises avançadas de desempenho</li>
              <li>✓ Planos de treino ilimitados</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
