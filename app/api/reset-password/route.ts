import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { rateLimitByIP, rateLimitConfigs } from "@/lib/rate-limit"
import { cookies } from "next/headers"

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

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    // Verificar se o usuário tem role admin
    const { data: currentUserProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !currentUserProfile || currentUserProfile.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado. Apenas administradores podem resetar senhas." }, { status: 403 })
    }

    // Rate limiting
    let rateLimitResult: { success: boolean; limit: number; remaining: number; reset: number } | null = null
    try {
      const ip = getIP(request)
      rateLimitResult = await rateLimitByIP(ip, rateLimitConfigs.sensitive || rateLimitConfigs.api)
    } catch (rateLimitError) {
      console.warn("[v0] Rate limiting error (continuing):", rateLimitError)
    }

    if (rateLimitResult && !rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Muitas requisições. Tente novamente mais tarde.",
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        },
      )
    }

    // Validar input
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
    }

    let validatedData
    try {
      validatedData = resetPasswordSchema.parse(body)
    } catch (error: any) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors || error.message },
        { status: 400 },
      )
    }

    const { userId, newPassword } = validatedData

    // Verificar se SUPABASE_SERVICE_ROLE_KEY está configurado
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[v0] SUPABASE_SERVICE_ROLE_KEY não configurado")
      return NextResponse.json({ error: "Erro de configuração do servidor" }, { status: 500 })
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
    console.log("[v0] Resetting password for user:", userId)
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (updateError) {
      console.error("[v0] Error resetting password:", updateError)
      return NextResponse.json(
        {
          error: "Erro ao resetar senha",
          details: process.env.NODE_ENV === "development" ? updateError.message : undefined,
        },
        { status: 500 },
      )
    }

    if (!updateData.user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const responseHeaders: Record<string, string> = {}
    if (rateLimitResult) {
      responseHeaders["X-RateLimit-Limit"] = rateLimitResult.limit.toString()
      responseHeaders["X-RateLimit-Remaining"] = rateLimitResult.remaining.toString()
    }

    return NextResponse.json(
      {
        success: true,
        message: "Senha resetada com sucesso",
        user: {
          id: updateData.user.id,
          email: updateData.user.email,
        },
      },
      {
        headers: responseHeaders,
      },
    )
  } catch (error: any) {
    console.error("[v0] API error:", error)
    console.error("[v0] API error stack:", error.stack)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}

