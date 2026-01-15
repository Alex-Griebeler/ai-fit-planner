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
import evolveLogo from '@/assets/evolve-logo-new.png';

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
        toast.error(error.message);
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
              <img src={evolveLogo} alt="Evolve" className="h-16 mx-auto mb-4" />
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
              className="mx-auto mb-4"
            >
              <img src={evolveLogo} alt="Evolve" className="h-16 mx-auto" />
            </motion.div>
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

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground text-sm">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Social Login */}
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar com Google
          </Button>

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
