/**
 * Rate limiting utility usando Map em memória
 * Para produção, considere usar Redis ou Vercel Edge Config
 */

interface RateLimitOptions {
  interval: number // em milissegundos
  uniqueTokenPerInterval: number // número de requisições permitidas
}

interface RateLimitStore {
  [key: string]: number[]
}

// Store em memória (para produção, use Redis)
const store: RateLimitStore = {}

// Limpar entradas antigas periodicamente
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    store[key] = store[key].filter((timestamp) => now - timestamp < 60000) // manter apenas últimos 60s
    if (store[key].length === 0) {
      delete store[key]
    }
  })
}, 60000) // limpar a cada minuto

export async function rateLimit(
  identifier: string,
  options: RateLimitOptions = { interval: 60000, uniqueTokenPerInterval: 10 },
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const now = Date.now()
  const windowStart = now - options.interval

  // Inicializar array se não existir
  if (!store[identifier]) {
    store[identifier] = []
  }

  // Remover timestamps antigos
  store[identifier] = store[identifier].filter((timestamp) => timestamp > windowStart)

  // Verificar se excedeu o limite
  if (store[identifier].length >= options.uniqueTokenPerInterval) {
    const oldestRequest = Math.min(...store[identifier])
    const reset = oldestRequest + options.interval

    return {
      success: false,
      limit: options.uniqueTokenPerInterval,
      remaining: 0,
      reset,
    }
  }

  // Adicionar nova requisição
  store[identifier].push(now)

  return {
    success: true,
    limit: options.uniqueTokenPerInterval,
    remaining: options.uniqueTokenPerInterval - store[identifier].length,
    reset: now + options.interval,
  }
}

// Helper para rate limiting por IP
export async function rateLimitByIP(
  ip: string,
  options?: RateLimitOptions,
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  return rateLimit(`ip:${ip}`, options)
}

// Helper para rate limiting por usuário
export async function rateLimitByUser(
  userId: string,
  options?: RateLimitOptions,
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  return rateLimit(`user:${userId}`, options)
}

// Configurações padrão para diferentes tipos de endpoints
export const rateLimitConfigs = {
  // API routes gerais
  api: { interval: 60000, uniqueTokenPerInterval: 30 },
  // Criação de perfil (mais restritivo)
  createProfile: { interval: 60000, uniqueTokenPerInterval: 5 },
  // Login (muito restritivo)
  login: { interval: 900000, uniqueTokenPerInterval: 5 }, // 5 tentativas a cada 15 minutos
  // Operações sensíveis
  sensitive: { interval: 60000, uniqueTokenPerInterval: 10 },
}

