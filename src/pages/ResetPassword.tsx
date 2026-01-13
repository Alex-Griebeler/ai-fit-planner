import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import evolveLogo from '@/assets/evolve-logo.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(password);

      if (error) {
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success('Senha alterada com sucesso!');
      }
    } catch {
      toast.error('Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="absolute inset-0 gradient-glow opacity-50" />
        
        <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm text-center"
          >
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Senha Alterada!
            </h1>
            <p className="text-muted-foreground mb-6">
              Sua senha foi alterada com sucesso.
            </p>
            <Button 
              variant="gradient" 
              size="lg" 
              className="w-full"
              onClick={() => navigate('/dashboard')}
            >
              Ir para o Dashboard
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 gradient-glow opacity-50" />
      
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="mx-auto mb-4"
            >
              <img src={evolveLogo} alt="Evolve" className="h-16 mx-auto" />
            </motion.div>
            <h1 className="text-xl font-bold text-foreground">
              Redefinir Senha
            </h1>
            <p className="text-muted-foreground mt-2">
              Digite sua nova senha abaixo
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12"
                required
                minLength={6}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirmar nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <Button 
              variant="gradient" 
              size="lg" 
              className="w-full" 
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              Salvar Nova Senha
            </Button>
          </form>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-2 w-full mt-6 text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o login
          </button>
        </motion.div>
      </div>
    </div>
  );
}
