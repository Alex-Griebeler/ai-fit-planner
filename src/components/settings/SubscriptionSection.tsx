import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Crown, CreditCard, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useSubscription } from '@/hooks/useSubscription';

export function SubscriptionSection() {
  const { 
    subscription, 
    isPremium, 
    isLoading, 
    createCheckout, 
    openCustomerPortal,
    checkSubscription 
  } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Sua Assinatura
              </CardTitle>
              <CardDescription>
                Gerencie seu plano e pagamentos
              </CardDescription>
            </div>
            <Badge 
              variant={isPremium ? 'default' : 'secondary'}
              className={isPremium ? 'bg-gradient-to-r from-amber-500 to-amber-600' : ''}
            >
              {isPremium ? (
                <>
                  <Crown className="w-3 h-3 mr-1" />
                  Premium
                </>
              ) : (
                'Gratuito'
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPremium ? (
            <>
              <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold text-foreground">Plano Premium Ativo</span>
                </div>
                {subscription?.subscriptionEnd && (
                  <p className="text-sm text-muted-foreground">
                    Próxima cobrança em {format(
                      new Date(subscription.subscriptionEnd), 
                      "d 'de' MMMM 'de' yyyy",
                      { locale: ptBR }
                    )}
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Seus benefícios:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Gráficos de evolução de cargas
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Histórico completo de treinos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Análises avançadas de desempenho
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Planos de treino ilimitados
                  </li>
                </ul>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={openCustomerPortal}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Gerenciar Assinatura
                </Button>
                <Button
                  variant="ghost"
                  onClick={checkSubscription}
                  size="icon"
                >
                  ↻
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  Você está no plano gratuito. Faça upgrade para desbloquear 
                  todos os recursos premium!
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">
                  O que você terá com o Premium:
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Gráficos de evolução de cargas
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Histórico completo de treinos
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Análises avançadas de desempenho
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Planos de treino ilimitados
                  </li>
                </ul>
              </div>

              <Button 
                onClick={createCheckout}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                size="lg"
              >
                <Crown className="w-4 h-4 mr-2" />
                Fazer Upgrade - R$ 29,90/mês
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
