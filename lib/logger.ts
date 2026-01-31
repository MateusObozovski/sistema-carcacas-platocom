/**
 * Logger seguro que só exibe logs detalhados em desenvolvimento
 * Em produção, logs sensíveis são suprimidos ou enviados para serviço de monitoramento
 */

const isDevelopment = process.env.NODE_ENV === "development"

export const logger = {
  /**
   * Log informativo - apenas em desenvolvimento
   */
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  /**
   * Log de aviso - apenas em desenvolvimento
   */
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },

  /**
   * Log de erro - em produção, apenas mensagem genérica
   * Em desenvolvimento, detalhes completos
   */
  error: (message: string, error?: unknown) => {
    if (isDevelopment) {
      console.error(message, error)
    } else {
      // Em produção, registrar apenas mensagem genérica
      console.error(message)
      // TODO: Enviar para serviço de monitoramento (Sentry, LogRocket, etc.)
      // Example: Sentry.captureException(error)
    }
  },

  /**
   * Log de informação crítica - sempre exibido
   * Use apenas para informações que não sejam sensíveis
   */
  info: (...args: unknown[]) => {
    console.info(...args)
  },
}

/**
 * Helper para sanitizar dados sensíveis de objetos antes de logar
 */
export function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ["password", "token", "secret", "apiKey", "api_key", "authorization"]
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = "[REDACTED]"
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeForLog(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}
