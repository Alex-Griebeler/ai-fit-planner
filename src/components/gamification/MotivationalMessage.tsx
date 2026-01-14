import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Sun, Moon, Flame, Coffee, Zap } from 'lucide-react';
import { useStreak } from '@/hooks/useStreak';

interface MotivationalMessageProps {
  userName?: string;
}

interface Message {
  text: string;
  icon: typeof Sparkles;
  gradient: string;
}

export function MotivationalMessage({ userName }: MotivationalMessageProps) {
  const { streak, isStreakAtRisk, daysSinceLastWorkout } = useStreak();

  const message = useMemo((): Message => {
    const hour = new Date().getHours();
    const currentStreak = streak?.current_streak ?? 0;
    const name = userName?.split(' ')[0] ?? '';

    // Priority messages based on streak status
    if (isStreakAtRisk && currentStreak > 0) {
      return {
        text: `Não deixe sua sequência de ${currentStreak} dias acabar! ${name ? `Vamos, ${name}!` : 'Bora treinar!'}`,
        icon: Flame,
        gradient: 'from-orange-500 to-red-500',
      };
    }

    if (daysSinceLastWorkout !== null && daysSinceLastWorkout >= 3 && daysSinceLastWorkout < 7) {
      return {
        text: `Já se passaram ${daysSinceLastWorkout} dias. ${name ? `${name}, seu` : 'Seu'} corpo está esperando!`,
        icon: Zap,
        gradient: 'from-yellow-500 to-orange-500',
      };
    }

    if (daysSinceLastWorkout !== null && daysSinceLastWorkout >= 7) {
      return {
        text: `Hora de voltar! Cada recomeço é uma vitória.`,
        icon: Sparkles,
        gradient: 'from-purple-500 to-pink-500',
      };
    }

    // Streak celebration messages
    if (currentStreak >= 30) {
      return {
        text: `${currentStreak} dias de dedicação! Você é imparável${name ? `, ${name}` : ''}!`,
        icon: Flame,
        gradient: 'from-orange-500 to-red-500',
      };
    }

    if (currentStreak >= 7) {
      return {
        text: `Semana de fogo! ${currentStreak} dias e contando 🔥`,
        icon: Flame,
        gradient: 'from-orange-500 to-yellow-500',
      };
    }

    // Time-based greetings
    if (hour >= 5 && hour < 12) {
      const morningMessages = [
        `Bom dia${name ? `, ${name}` : ''}! Energia matinal para treinar!`,
        `Acordar cedo já é meio caminho andado!`,
        `Manhã é o melhor horário para construir hábitos.`,
      ];
      return {
        text: morningMessages[Math.floor(Math.random() * morningMessages.length)],
        icon: Sun,
        gradient: 'from-yellow-400 to-orange-400',
      };
    }

    if (hour >= 12 && hour < 18) {
      const afternoonMessages = [
        `Boa tarde! Hora de quebrar o sedentarismo.`,
        `Uma pausa produtiva: hora do treino!`,
        `Tarde perfeita para evoluir.`,
      ];
      return {
        text: afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)],
        icon: Coffee,
        gradient: 'from-amber-500 to-orange-500',
      };
    }

    const eveningMessages = [
      `Boa noite! Treino noturno, resultados diurnos.`,
      `Fechar o dia com um treino? Escolha de campeões.`,
      `A noite é jovem e você está pronto!`,
    ];
    return {
      text: eveningMessages[Math.floor(Math.random() * eveningMessages.length)],
      icon: Moon,
      gradient: 'from-indigo-500 to-purple-500',
    };
  }, [streak, isStreakAtRisk, daysSinceLastWorkout, userName]);

  const IconComponent = message.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${message.gradient} p-4`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white" />
        <div className="absolute -left-4 -bottom-4 h-16 w-16 rounded-full bg-white" />
      </div>

      <div className="relative flex items-center gap-3">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <IconComponent className="h-6 w-6 text-white" />
        </motion.div>
        <p className="text-sm font-medium text-white">
          {message.text}
        </p>
      </div>
    </motion.div>
  );
}
