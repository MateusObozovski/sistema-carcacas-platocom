import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createProfileSchema, validateAndSanitize } from "@/lib/validation"
import { rateLimitByIP, rateLimitConfigs } from "@/lib/rate-limit"

// Helper para obter IP do request
function getIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  return forwarded?.split(",")[0] || realIP || "unknown"
}

export async function POST(request: Request) {
  try {
    // Rate limiting por IP
    const ip = getIP(request)
    const rateLimitResult = await rateLimitByIP(ip, rateLimitConfigs.createProfile)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Muitas requisições. Tente novamente mais tarde.",
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimitResult.reset).toISOString(),
          },
        },
      )
    }

    // Validar e sanitizar input
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
    }

    let validatedData
    try {
      validatedData = validateAndSanitize(createProfileSchema, body)
    } catch (error: unknown) {
      const err = error as { errors?: unknown; message?: string }
      return NextResponse.json(
        { error: "Dados inválidos", details: err.errors || err.message },
        { status: 400 },
      )
    }

    const { userId, email, name, role } = validatedData

    // Verificar se SUPABASE_SERVICE_ROLE_KEY está configurado
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[create-profile] SUPABASE_SERVICE_ROLE_KEY não configurado")
      return NextResponse.json({ error: "Erro de configuração do servidor" }, { status: 500 })
    }

    // Verificar autenticação - o usuário deve estar logado
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
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
      data: { user: authenticatedUser },
    } = await supabaseAuth.auth.getUser()

    // Use service role to bypass RLS
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

    // SEGURANÇA: Validar que o userId corresponde ao usuário autenticado
    // ou que o userId existe no Supabase Auth (para casos de auto-criação pós-signup)
    if (authenticatedUser) {
      // Se o usuário está autenticado, só pode criar perfil para si mesmo
      if (authenticatedUser.id !== userId) {
        return NextResponse.json(
          { error: "Não autorizado: userId não corresponde ao usuário autenticado" },
          { status: 403 },
        )
      }
    } else {
      // Se não há sessão, verificar se o userId existe no Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)

      if (authError || !authUser?.user) {
        return NextResponse.json(
          { error: "Não autorizado: usuário não encontrado" },
          { status: 403 },
        )
      }

      // Verificar se o email corresponde
      if (authUser.user.email?.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          { error: "Não autorizado: email não corresponde" },
          { status: 403 },
        )
      }
    }

    // Check if profile already exists
    const { data: existing } = await supabaseAdmin.from("profiles").select("id, email, nome, role").eq("id", userId).maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, profile: existing })
    }

    // SEGURANÇA: Forçar role padrão para novos perfis criados via API
    // Apenas admins podem definir roles diferentes (via /api/create-user)
    const safeRole = "Vendedor"

    // Create the profile
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .insert([
        {
          id: userId,
          email,
          nome: name,
          role: safeRole,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[create-profile] Error creating profile:", error)
      return NextResponse.json({ error: "Erro ao criar perfil" }, { status: 500 })
    }

    // Log apenas em desenvolvimento
    if (process.env.NODE_ENV === "development") {
      console.log("[create-profile] Profile created:", profile?.id)
    }

    return NextResponse.json(
      {
        success: true,
        profile: {
          id: profile?.id,
          email: profile?.email,
          nome: profile?.nome,
          role: profile?.role
        }
      },
      {
        headers: {
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      },
    )
  } catch (error) {
    console.error("[create-profile] API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
