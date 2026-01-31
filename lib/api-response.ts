/**
 * Helpers para padronizar respostas de API com tratamento de erro seguro
 */

import { NextResponse } from "next/server"
import { ZodError } from "zod"

/**
 * Formata mensagem de erro de forma segura
 * Em produção, não expõe detalhes técnicos
 */
export function formatErrorResponse(error: unknown, genericMessage = "Erro interno do servidor") {
  const isDevelopment = process.env.NODE_ENV === "development"

  // Erro de validação Zod
  if (error instanceof ZodError) {
    return {
      error: "Dados inválidos",
      details: isDevelopment ? error.errors : undefined,
    }
  }

  // Erro genérico
  if (error instanceof Error) {
    return {
      error: genericMessage,
      details: isDevelopment ? error.message : undefined,
    }
  }

  // Erro desconhecido
  return {
    error: genericMessage,
    details: isDevelopment ? String(error) : undefined,
  }
}

/**
 * Resposta de erro padronizada
 */
export function errorResponse(
  error: unknown,
  status: number = 500,
  genericMessage?: string
): NextResponse {
  return NextResponse.json(formatErrorResponse(error, genericMessage), { status })
}

/**
 * Resposta de sucesso padronizada
 */
export function successResponse<T>(data: T, status: number = 200, headers?: HeadersInit): NextResponse {
  return NextResponse.json(data, { status, headers })
}

/**
 * Resposta de validação de erro
 */
export function validationErrorResponse(details: unknown): NextResponse {
  return NextResponse.json(
    {
      error: "Dados inválidos",
      details: process.env.NODE_ENV === "development" ? details : undefined,
    },
    { status: 400 }
  )
}

/**
 * Resposta de não autorizado
 */
export function unauthorizedResponse(message = "Não autenticado"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}

/**
 * Resposta de acesso negado
 */
export function forbiddenResponse(message = "Acesso negado"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}

/**
 * Resposta de rate limit
 */
export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error: "Muitas requisições. Tente novamente mais tarde.",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfter.toString(),
      },
    }
  )
}
