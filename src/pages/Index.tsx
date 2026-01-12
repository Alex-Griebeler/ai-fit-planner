import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Dumbbell, 
  Sparkles, 
  Target, 
  Clock, 
  TrendingUp,
  ChevronRight,
  Star
} from 'lucide-react';

const features = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'IA Personalizada',
    description: 'Treinos criados especificamente para seus objetivos',
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Resultados Reais',
    description: 'Progressão inteligente baseada no seu desempenho',
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: 'Seu Tempo',
    description: 'Treinos adaptados à sua disponibilidade',
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Evolução Contínua',
    description: 'Acompanhamento e ajustes automáticos',
  },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <div className="relative">
        {/* Background effects */}
        <div className="absolute inset-0 gradient-glow" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        
        <div className="container max-w-lg mx-auto px-4 py-12 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-24 h-24 mx-auto mb-6 rounded-3xl gradient-primary flex items-center justify-center shadow-glow"
            >
              <Dumbbell className="w-12 h-12 text-primary-foreground" />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4"
            >
              Seu Personal
              <span className="text-gradient"> Trainer IA</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-muted-foreground mb-8 max-w-sm mx-auto"
            >
              Treinos 100% personalizados para você alcançar seus objetivos
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col gap-3"
            >
              <Button
                variant="gradient"
                size="lg"
                className="w-full text-base"
                onClick={() => navigate('/login')}
              >
                Começar Agora
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Já tenho conta
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container max-w-lg mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-xl font-display font-bold text-foreground mb-6 text-center">
            Por que escolher o AI Trainer?
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="bg-card border border-border rounded-2xl p-4 shadow-card"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 text-primary">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Testimonial Section */}
      <div className="container max-w-lg mx-auto px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-card"
        >
          <div className="flex gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-primary text-primary" />
            ))}
          </div>
          <p className="text-foreground mb-4">
            "Finalmente encontrei um app que entende minhas limitações e cria
            treinos que eu consigo fazer. Já perdi 8kg em 3 meses!"
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              M
            </div>
            <div>
              <p className="font-semibold text-foreground">Marina S.</p>
              <p className="text-sm text-muted-foreground">Aluna há 4 meses</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border p-4">
        <div className="container max-w-lg mx-auto">
          <Button
            variant="gradient"
            size="lg"
            className="w-full"
            onClick={() => navigate('/login')}
          >
            Criar Meu Treino Personalizado
          </Button>
        </div>
      </div>
    </div>
  );
}
