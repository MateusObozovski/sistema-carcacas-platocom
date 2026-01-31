/**
 * CSRF Protection para API Routes
 * Valida que a requisição vem do mesmo domínio comparando Origin com Host
 */

import { NextRequest, NextResponse } from "next/server"

/**
 * Verifica se a requisição é de origem confiável
 * Compara o header Origin com o Host esperado
 */
export function validateCSRF(request: NextRequest): { valid: boolean; error?: string } {
  // Apenas validar para métodos que mudam estado
  const method = request.method
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { valid: true }
  }

  // Obter origin da requisição
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")

  // Obter host esperado
  const host = request.headers.get("host")
  const forwardedHost = request.headers.get("x-forwarded-host")
  const expectedHost = forwardedHost || host

  // Se não há origin nem referer, pode ser requisição de mesmo origem (sem CORS)
  // ou uma requisição maliciosa. Por segurança, vamos rejeitar em produção
  if (!origin && !referer) {
    // Em desenvolvimento local, permitir (fetch pode não enviar origin)
    if (process.env.NODE_ENV === "development") {
      return { valid: true }
    }
    return {
      valid: false,
      error: "Missing origin header",
    }
  }

  // Validar origin
  if (origin) {
    try {
      const originUrl = new URL(origin)
      if (originUrl.host !== expectedHost) {
        return {
          valid: false,
          error: `Invalid origin: ${originUrl.host} !== ${expectedHost}`,
        }
      }
    } catch {
      return {
        valid: false,
        error: "Invalid origin format",
      }
    }
  }

  // Validar referer como fallback
  if (!origin && referer) {
    try {
      const refererUrl = new URL(referer)
      if (refererUrl.host !== expectedHost) {
        return {
          valid: false,
          error: `Invalid referer: ${refererUrl.host} !== ${expectedHost}`,
        }
      }
    } catch {
      return {
        valid: false,
        error: "Invalid referer format",
      }
    }
  }

  return { valid: true }
}

/**
 * Middleware helper para aplicar CSRF protection em API routes
 */
export function withCSRFProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const csrfCheck = validateCSRF(request)

    if (!csrfCheck.valid) {
      console.error("[CSRF] Protection triggered:", csrfCheck.error)
      return NextResponse.json(
        {
          error: "Forbidden: Invalid origin",
        },
        { status: 403 }
      )
    }

    return handler(request)
  }
}
