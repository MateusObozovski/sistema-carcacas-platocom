import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Verifica se um erro é relacionado a autenticação (401, token expirado, etc)
 */
export function isAuthError(error: any): boolean {
  if (!error) return false
  
  // Verificar código de status HTTP
  if (error.status === 401 || error.code === 'PGRST301' || error.code === '42501') {
    return true
  }
  
  // Verificar mensagem de erro
  const errorMessage = error.message?.toLowerCase() || ''
  const authKeywords = ['unauthorized', 'authentication', 'token', 'session', 'expired', 'invalid jwt']
  return authKeywords.some(keyword => errorMessage.includes(keyword))
}
