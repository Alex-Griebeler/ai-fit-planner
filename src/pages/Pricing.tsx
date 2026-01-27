import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown, Sparkles, Zap, BarChart3, History, HeadphonesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';

const freePlanFeatures = [
  '1 plano de treino ativo',
  'Execução guiada de treinos',
  'Timer de descanso',
  'Salvar cargas dos exercícios',
];

const premiumPlanFeatures = [
  'Planos de treino ilimitados',
  'Gráficos de evolução de cargas',
  'Histórico completo de treinos',
  'Análises avançadas de desempenho',
  'Estatísticas de volume e frequência',
  'Suporte prioritário',
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, isLoading, createCheckout } = useSubscription();

  const handleUpgrade = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    createCheckout();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Try to go back, but if there's no history, go to dashboard
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/dashboard');
              }
            }}
            className="mr-4 press-scale"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Planos</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Escolha o plano ideal para você
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comece gratuitamente e faça upgrade quando estiver pronto para 
            desbloquear todo o potencial da sua evolução.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className={`h-full ${!isPremium ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Gratuito</CardTitle>
                  {!isPremium && !isLoading && (
                    <Badge variant="outline">Seu plano</Badge>
                  )}
                </div>
                <CardDescription>
                  Perfeito para começar sua jornada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <span className="text-4xl font-bold">R$ 0</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>

                <ul className="space-y-3">
                  {freePlanFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled
                >
                  {!isPremium ? 'Plano atual' : 'Plano básico'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className={`h-full relative overflow-hidden ${isPremium ? 'ring-2 ring-primary' : ''}`}>
              {/* Premium badge */}
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold rounded-bl-lg">
                Recomendado
              </div>

              <CardHeader className="pt-8">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Premium
                  </CardTitle>
                  {isPremium && !isLoading && (
                    <Badge className="bg-primary text-primary-foreground">
                      Seu plano
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Para quem leva a evolução a sério
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <span className="text-4xl font-bold">R$ 29,90</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>

                <ul className="space-y-3">
                  {premiumPlanFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={handleUpgrade}
                  disabled={isPremium || isLoading}
                  variant="gradient"
                  className="w-full press-scale"
                  size="lg"
                >
                  {isLoading ? (
                    <span className="animate-pulse">Carregando...</span>
                  ) : isPremium ? (
                    'Você já é Premium!'
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Começar agora
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Features comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <h3 className="text-2xl font-bold text-center mb-8">
            Por que escolher o Premium?
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center p-6 hover-lift transition-transform">
              <BarChart3 className="w-10 h-10 text-primary mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Gráficos de Evolução</h4>
              <p className="text-sm text-muted-foreground">
                Visualize sua progressão de cargas ao longo do tempo com gráficos detalhados.
              </p>
            </Card>

            <Card className="text-center p-6 hover-lift transition-transform">
              <History className="w-10 h-10 text-primary mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Histórico Completo</h4>
              <p className="text-sm text-muted-foreground">
                Acesse todo o seu histórico de treinos e analise seu desempenho.
              </p>
            </Card>

            <Card className="text-center p-6 hover-lift transition-transform">
              <HeadphonesIcon className="w-10 h-10 text-primary mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Suporte Prioritário</h4>
              <p className="text-sm text-muted-foreground">
                Tenha acesso a suporte exclusivo para tirar todas as suas dúvidas.
              </p>
            </Card>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
