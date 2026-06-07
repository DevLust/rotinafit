export function parseAuthError(error: unknown): string {
  const msg = (error as any)?.message ?? String(error);

  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
  }
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('User already registered')) {
    return 'Este e-mail já possui uma conta cadastrada.';
  }
  if (msg.includes('Password should be at least')) {
    return 'A senha deve ter no mínimo 6 caracteres.';
  }
  if (msg.includes('Unable to validate email address')) {
    return 'E-mail inválido. Verifique e tente novamente.';
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('NetworkError')) {
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
  }
  if (msg.includes('JWT expired') || msg.includes('token is expired')) {
    return 'Sua sessão expirou. Faça login novamente.';
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

export function parseDbError(error: unknown, context?: string): string {
  const msg = (error as any)?.message ?? (error as any)?.error_description ?? String(error);
  const code = (error as any)?.code ?? '';

  if (msg.includes('network') || msg.includes('fetch') || msg.includes('NetworkError')) {
    return 'Sem conexão. Verifique sua internet e tente novamente.';
  }
  if (msg.includes('JWT expired') || msg.includes('token is expired') || code === 'PGRST301') {
    return 'Sessão expirada. Faça login novamente.';
  }
  if (code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
    if (context === 'checkin') return 'Você já fez check-in hoje.';
    if (context === 'group_join') return 'Você já é membro deste grupo.';
    return 'Este registro já existe.';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'Sem permissão para realizar esta ação. Verifique se está logado.';
  }
  if (msg.includes('not found') || code === 'PGRST116') {
    return 'Registro não encontrado.';
  }
  return 'Não foi possível completar a operação. Tente novamente.';
}
