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
const updateUserSchema = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100).trim().optional(),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(100).optional(),
  ativo: z.boolean().optional(),
})

export async function PATCH(request: NextRequest) {
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
      return NextResponse.json({ error: "Acesso negado. Apenas administradores podem atualizar usuários." }, { status: 403 })
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
      validatedData = updateUserSchema.parse(body)
    } catch (error: any) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors || error.message },
        { status: 400 },
      )
    }

    const { userId, name, password, ativo } = validatedData

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

    // Atualizar senha se fornecida
    if (password) {
      console.log("[v0] Updating password for user:", userId)
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
      })

      if (passwordError) {
        console.error("[v0] Error updating password:", passwordError)
        return NextResponse.json(
          {
            error: "Erro ao atualizar senha",
            details: process.env.NODE_ENV === "development" ? passwordError.message : undefined,
          },
          { status: 500 },
        )
      }
    }

    // Atualizar profile (nome e ativo)
    const updateData: { nome?: string; ativo?: boolean; updated_at?: string } = {}
    if (name !== undefined) {
      updateData.nome = name
    }
    if (ativo !== undefined) {
      updateData.ativo = ativo
    }
    updateData.updated_at = new Date().toISOString()

    if (Object.keys(updateData).length > 0) {
      console.log("[v0] Updating profile for user:", userId, updateData)
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", userId)

      if (profileUpdateError) {
        console.error("[v0] Error updating profile:", profileUpdateError)
        return NextResponse.json(
          {
            error: "Erro ao atualizar perfil",
            details: process.env.NODE_ENV === "development" ? profileUpdateError.message : undefined,
          },
          { status: 500 },
        )
      }
    }

    const responseHeaders: Record<string, string> = {}
    if (rateLimitResult) {
      responseHeaders["X-RateLimit-Limit"] = rateLimitResult.limit.toString()
      responseHeaders["X-RateLimit-Remaining"] = rateLimitResult.remaining.toString()
    }

    return NextResponse.json(
      {
        success: true,
        message: "Usuário atualizado com sucesso",
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

