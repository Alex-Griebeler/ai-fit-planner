import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Dumbbell, 
  Sparkles, 
  Target, 
  Clock, 
  TrendingUp,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Users
} from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'IA Avançada',
    description: 'Treinos criados com inteligência artificial de ponta',
  },
  {
    icon: Target,
    title: 'Personalização Total',
    description: 'Adaptado ao seu corpo, objetivos e rotina',
  },
  {
    icon: Clock,
    title: 'Seu Tempo',
    description: 'Treinos que cabem na sua agenda',
  },
  {
    icon: TrendingUp,
    title: 'Progressão Inteligente',
    description: 'Evolução contínua com periodização científica',
  },
];

const stats = [
  { value: '10k+', label: 'Usuários ativos' },
  { value: '50k+', label: 'Treinos gerados' },
  { value: '4.9', label: 'Avaliação média' },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        <div className="container max-w-5xl mx-auto px-4 py-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm mb-8"
            >
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                Powered by AI
              </span>
            </motion.div>

            {/* Main Title */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight mb-6">
              <span className="block">Seu Personal</span>
              <span className="block text-gradient">Trainer IA</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Treinos 100% personalizados criados por inteligência artificial.
              <span className="text-foreground font-medium"> Resultados reais</span> em menos tempo.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button
                variant="gradient"
                size="lg"
                className="w-full sm:w-auto min-w-[200px] text-base h-14"
                onClick={() => navigate('/login')}
              >
                Começar Agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto min-w-[200px] h-14"
                onClick={() => navigate('/login')}
              >
                Já tenho conta
              </Button>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-8 sm:gap-16"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2"
          >
            <div className="w-1 h-2 rounded-full bg-muted-foreground/50" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/30 to-transparent" />
        
        <div className="container max-w-5xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4">
              Por que escolher o <span className="text-gradient">AI Trainer</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Tecnologia de ponta para resultados extraordinários
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="group relative p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover-lift"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-24">
        <div className="container max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative p-8 sm:p-12 rounded-3xl bg-card border border-border overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-primary text-primary" />
                ))}
              </div>
              
              <blockquote className="text-xl sm:text-2xl font-display text-foreground mb-8 leading-relaxed">
                "Finalmente encontrei um app que entende minhas limitações e cria
                treinos que eu realmente consigo fazer. <span className="text-primary font-semibold">Perdi 12kg em 4 meses</span> sem precisar de personal!"
              </blockquote>
              
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                  M
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">Marina Santos</p>
                  <p className="text-muted-foreground">Usuária há 6 meses</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 border-t border-border">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Dados protegidos</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">+10.000 usuários</span>
            </div>
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              <span className="text-sm font-medium">+120 exercícios</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 relative">
        <div className="absolute inset-0 gradient-glow" />
        
        <div className="container max-w-3xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-6">
              Pronto para <span className="text-gradient">transformar</span> seu corpo?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              Comece agora e receba seu primeiro treino personalizado em menos de 2 minutos.
            </p>
            <Button
              variant="gradient"
              size="lg"
              className="min-w-[280px] h-16 text-lg"
              onClick={() => navigate('/login')}
            >
              Criar Meu Treino Grátis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold">AI Trainer</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 AI Trainer. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
