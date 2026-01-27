import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Loader2, CheckCircle, Dumbbell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePasswordValidation } from '@/hooks/usePasswordValidation';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  const passwordValidation = usePasswordValidation(password);

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setValidSession(true);
      }
      setChecking(false);
    };
    
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (!passwordValidation.isValid) {
      toast.error('A senha não atende aos requisitos mínimos');
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
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      toast.error('Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="absolute inset-0 gradient-glow opacity-50" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center relative"
        >
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
            <Dumbbell className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold mb-4">Link inválido ou expirado</h1>
          <p className="text-muted-foreground mb-6">
            Este link de recuperação de senha não é mais válido. 
            Por favor, solicite um novo link.
          </p>
          <Button onClick={() => navigate('/login')} variant="gradient" className="w-full">
            Voltar ao login
          </Button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="absolute inset-0 gradient-glow opacity-50" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center relative"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          </motion.div>
          <h1 className="text-xl font-bold mb-2">Senha alterada!</h1>
          <p className="text-muted-foreground">
            Redirecionando para o login...
          </p>
        </motion.div>
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
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
              <Dumbbell className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">Nova senha</h1>
            <p className="text-muted-foreground mt-2">
              Digite sua nova senha abaixo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-12"
                  required
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
              
              <PasswordStrengthIndicator 
                validation={passwordValidation} 
                show={password.length > 0} 
              />
            </div>

            <div>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirmar nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive mt-1.5">
                  As senhas não coincidem
                </p>
              )}
            </div>

            <Button 
              variant="gradient" 
              size="lg" 
              className="w-full" 
              type="submit"
              disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              Alterar senha
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
