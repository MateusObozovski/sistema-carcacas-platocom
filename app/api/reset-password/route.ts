import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { rateLimitByIP, rateLimitConfigs } from "@/lib/rate-limit"
import { cookies } from "next/headers"
import { logger } from "@/lib/logger"
import { withCSRFProtection } from "@/lib/csrf-protection"
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  rateLimitResponse,
  validationErrorResponse,
} from "@/lib/api-response"

// Helper para obter IP do request
function getIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  return forwarded?.split(",")[0] || realIP || "unknown"
}

// Schema de validação
const resetPasswordSchema = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
  newPassword: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número"
    ),
})

async function resetPasswordHandler(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // No-op em API routes
          },
        },
      },
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return unauthorizedResponse()
    }

    // Verificar se o usuário tem role admin
    const { data: currentUserProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !currentUserProfile || currentUserProfile.role !== "admin") {
      return forbiddenResponse("Acesso negado. Apenas administradores podem resetar senhas.")
    }

    // Rate limiting
    let rateLimitResult: { success: boolean; limit: number; remaining: number; reset: number } | null = null
    try {
      const ip = getIP(request)
      rateLimitResult = await rateLimitByIP(ip, rateLimitConfigs.sensitive || rateLimitConfigs.api)
    } catch (rateLimitError) {
      logger.warn("[reset-password] Rate limiting error (continuing):", rateLimitError)
    }

    if (rateLimitResult && !rateLimitResult.success) {
      return rateLimitResponse(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
    }

    // Validar input
    let body
    try {
      body = await request.json()
    } catch {
      return validationErrorResponse("JSON inválido")
    }

    let validatedData
    try {
      validatedData = resetPasswordSchema.parse(body)
    } catch (error) {
      return validationErrorResponse(error)
    }

    const { userId, newPassword } = validatedData

    // Verificar se SUPABASE_SERVICE_ROLE_KEY está configurado
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error("[reset-password] SUPABASE_SERVICE_ROLE_KEY não configurado")
      return errorResponse(new Error("Service role key not configured"), 500, "Erro de configuração do servidor")
    }

    // Criar cliente admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // Resetar senha usando Admin API
    logger.log("[reset-password] Resetting password for user:", userId)
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (updateError) {
      logger.error("[reset-password] Error resetting password", updateError)
      return errorResponse(updateError, 500, "Erro ao resetar senha")
    }

    if (!updateData.user) {
      return errorResponse(new Error("User not found"), 404, "Usuário não encontrado")
    }

    const responseHeaders: Record<string, string> = {}
    if (rateLimitResult) {
      responseHeaders["X-RateLimit-Limit"] = rateLimitResult.limit.toString()
      responseHeaders["X-RateLimit-Remaining"] = rateLimitResult.remaining.toString()
    }

    return successResponse(
      {
        success: true,
        message: "Senha resetada com sucesso",
        user: {
          id: updateData.user.id,
          email: updateData.user.email,
        },
      },
      200,
      responseHeaders
    )
  } catch (error) {
    logger.error("[reset-password] API error", error)
    return errorResponse(error)
  }
}

// Exportar com proteção CSRF
export const POST = withCSRFProtection(resetPasswordHandler)

