import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { rateLimitByIP, rateLimitConfigs } from "@/lib/rate-limit"
import { cookies } from "next/headers"

// Helper para obter IP do request
function getIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  return forwarded?.split(",")[0] || realIP || "unknown"
}

// Schema de validação
const createUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100).trim(),
  email: z.string().email("Email inválido").toLowerCase().trim(),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").max(100),
  role: z.enum(["admin", "Gerente", "Coordenador", "Vendedor"]),
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
      return NextResponse.json({ error: "Acesso negado. Apenas administradores podem criar usuários." }, { status: 403 })
    }

    // Rate limiting
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
      validatedData = createUserSchema.parse(body)
    } catch (error: any) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors || error.message },
        { status: 400 },
      )
    }

    const { name, email, password, role } = validatedData

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

    // Criar usuário no Supabase Auth
    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome: name,
        role,
      },
    })

    if (createUserError) {
      console.error("[v0] Error creating user:", createUserError)
      if (createUserError.message.includes("already registered")) {
        return NextResponse.json({ error: "Este email já está cadastrado" }, { status: 409 })
      }
      return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 })
    }

    // O trigger no banco deve criar o profile automaticamente
    // Mas vamos verificar e criar se necessário
    const { data: newUserProfile, error: newUserProfileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle()

    if (newUserProfileError || !newUserProfile) {
      // Tentar criar o profile manualmente
      const { error: createProfileError } = await supabaseAdmin.from("profiles").insert({
        id: authData.user.id,
        email,
        nome: name,
        role,
      })

      if (createProfileError) {
        console.error("[v0] Error creating profile:", createProfileError)
        // Não falhar aqui, o trigger pode ter criado
      }
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name,
          role,
        },
      },
      {
        headers: {
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      },
    )
  } catch (error: any) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

