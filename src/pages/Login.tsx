import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePasswordValidation } from '@/hooks/usePasswordValidation';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { TermsCheckbox } from '@/components/TermsCheckbox';
import { toast } from 'sonner';
import { Dumbbell } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get('mode');
  const [isLogin, setIsLogin] = useState(mode !== 'signup');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  
  // Sync isLogin state with URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlMode = params.get('mode');
    setIsLogin(urlMode !== 'signup');
  }, [location.search]);
  
  const passwordValidation = usePasswordValidation(password);

  // Get the redirect destination from location state
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate terms acceptance for signup
    if (!isLogin && !acceptedTerms) {
      setTermsError(true);
      toast.error('Você precisa aceitar os Termos de Uso e a Política de Privacidade');
      return;
    }
    
    setLoading(true);

    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        // Traduzir mensagens de erro comuns do Supabase Auth
        let errorMessage = error.message;
        if (error.message.toLowerCase().includes('user already registered')) {
          errorMessage = 'Este email já está cadastrado. Tente fazer login.';
        } else if (error.message.toLowerCase().includes('invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos.';
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          errorMessage = 'Confirme seu email antes de fazer login.';
        }
        toast.error(errorMessage);
      } else {
        if (!isLogin) {
          toast.success('Conta criada com sucesso!');
        }
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast.error('Erro ao processar autenticação');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast.error(error.message);
      } else {
        setResetSent(true);
        toast.success('Email de recuperação enviado!');
      }
    } catch (err) {
      toast.error('Erro ao enviar email de recuperação');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
    // OAuth will redirect, so we don't need to handle success here
  };

  // Forgot password view
  if (isForgotPassword) {
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
              <h1 className="text-xl font-bold">Recuperar senha</h1>
              <p className="text-muted-foreground mt-2">
                {resetSent 
                  ? 'Verifique sua caixa de entrada' 
                  : 'Digite seu email para receber o link de recuperação'}
              </p>
            </div>

            {resetSent ? (
              <div className="text-center space-y-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-green-400">
                    Enviamos um email para <strong>{email}</strong> com instruções para redefinir sua senha.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetSent(false);
                  }}
                >
                  Voltar ao login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />

                <Button 
                  variant="gradient" 
                  size="lg" 
                  className="w-full" 
                  type="submit"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : null}
                  Enviar link de recuperação
                </Button>

                <Button 
                  variant="ghost" 
                  className="w-full"
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  disabled={loading}
                >
                  Voltar ao login
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background gradient */}
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
              className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4"
            >
              <Dumbbell className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl font-display font-bold">AI Trainer</h1>
            <p className="text-muted-foreground mt-2">
              Treinos personalizados por IA
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-12"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  disabled={loading}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
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
                show={!isLogin && password.length > 0} 
              />
            </div>

            {/* Confirm password field - only for registration */}
            {!isLogin && (
              <div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirmar senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-12"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    disabled={loading}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>
                )}
                {confirmPassword.length > 0 && password === confirmPassword && (
                  <p className="text-xs text-green-500 mt-1">✓ Senhas coincidem</p>
                )}
              </div>
            )}

            {/* Terms and Privacy checkbox - only for signup */}
            {!isLogin && (
              <TermsCheckbox
                accepted={acceptedTerms}
                onAcceptChange={(accepted) => {
                  setAcceptedTerms(accepted);
                  if (accepted) setTermsError(false);
                }}
                error={termsError}
                disabled={loading}
              />
            )}

            <Button 
              variant="gradient" 
              size="lg" 
              className="w-full press-scale" 
              type="submit"
              disabled={loading || (!isLogin && (!passwordValidation.isValid || password !== confirmPassword || !acceptedTerms))}
              aria-label={isLogin ? 'Entrar na conta' : 'Criar nova conta'}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              {isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          {/* Forgot password link */}
          {isLogin && (
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                disabled={loading}
              >
                Esqueceu sua senha?
              </button>
            </div>
          )}

          {/* Google Login - temporarily hidden */}
          {/* TODO: Re-enable when Google OAuth is properly configured */}

          {/* Toggle Login/Register */}
          <p className="text-center mt-6 text-muted-foreground">
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                // Limpa campos ao trocar entre login e cadastro
                setPassword('');
                setConfirmPassword('');
                setAcceptedTerms(false);
                setTermsError(false);
              }}
              className="text-primary font-semibold hover:underline"
              disabled={loading}
            >
              {isLogin ? 'Cadastre-se' : 'Entre'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
