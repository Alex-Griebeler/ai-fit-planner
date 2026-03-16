/**
 * Maps Supabase Auth error messages to user-friendly Portuguese messages.
 * Keeps original message in console for debugging.
 */
export function normalizeAuthError(error: unknown): Error {
  const raw = error instanceof Error ? error.message : String(error);

  // Log for debugging (no sensitive data — only error codes/messages from Supabase)
  console.error('[Auth Error]', raw);

  const map: Record<string, string> = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
    'User already registered': 'Este e-mail já está cadastrado.',
    'Password should be at least': 'A senha deve ter pelo menos 6 caracteres.',
    'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
    'For security purposes': 'Muitas tentativas. Aguarde alguns minutos.',
    'Auth session missing': 'Sessão expirada. Faça login novamente.',
    'New password should be different': 'A nova senha deve ser diferente da atual.',
    'User not found': 'Usuário não encontrado.',
    'Token has expired or is invalid': 'Link expirado ou inválido. Solicite um novo.',
  };

  for (const [key, friendly] of Object.entries(map)) {
    if (raw.includes(key)) {
      return new Error(friendly);
    }
  }

  return new Error('Ocorreu um erro. Tente novamente.');
}
