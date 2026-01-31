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
const createUserSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100).trim(),
  email: z.string().email("Email inválido").toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número"
    ),
  role: z.enum(["admin", "Gerente", "Coordenador", "Vendedor", "operador"]),
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

    // Rate limiting (com tratamento de erro)
    let rateLimitResult: { success: boolean; limit: number; remaining: number; reset: number } | null = null
    try {
      const ip = getIP(request)
      rateLimitResult = await rateLimitByIP(ip, rateLimitConfigs.createProfile || rateLimitConfigs.api)

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
    } catch (rateLimitError) {
      // Se rate limiting falhar, continuar (não bloquear a requisição)
      console.warn("[v0] Rate limiting error (continuing):", rateLimitError)
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
      console.error("[v0] NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ configurado" : "✗ não configurado")
      return NextResponse.json(
        {
          error: "Erro de configuração do servidor: SUPABASE_SERVICE_ROLE_KEY não está configurado",
        },
        { status: 500 },
      )
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error("[v0] NEXT_PUBLIC_SUPABASE_URL não configurado")
      return NextResponse.json(
        {
          error: "Erro de configuração do servidor: NEXT_PUBLIC_SUPABASE_URL não está configurado",
        },
        { status: 500 },
      )
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
    console.log("[v0] Creating user with email:", email, "role:", role)
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
      console.error("[v0] Error details:", JSON.stringify(createUserError, null, 2))
      if (createUserError.message.includes("already registered") || createUserError.message.includes("already exists")) {
        return NextResponse.json({ error: "Este email já está cadastrado" }, { status: 409 })
      }
      return NextResponse.json(
        {
          error: "Erro ao criar usuário",
          details: process.env.NODE_ENV === "development" ? createUserError.message : undefined,
        },
        { status: 500 },
      )
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 })
    }

    // O trigger no banco deve criar o profile automaticamente
    // Mas vamos verificar e criar se necessário
    console.log("[v0] Checking if profile was created for user:", authData.user.id)
    
    // Aguardar um pouco para o trigger executar
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    const { data: newUserProfile, error: newUserProfileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle()

    if (newUserProfileError) {
      console.error("[v0] Error checking profile:", newUserProfileError)
    }

    if (!newUserProfile) {
      console.log("[v0] Profile not found, creating manually...")
      // Tentar criar o profile manualmente
      const { data: createdProfile, error: createProfileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: authData.user.id,
          email,
          nome: name,
          role,
        })
        .select()
        .single()

      if (createProfileError) {
        console.error("[v0] Error creating profile:", createProfileError)
        console.error("[v0] Profile creation error details:", JSON.stringify(createProfileError, null, 2))
        // Se não conseguir criar o profile, ainda retornar sucesso pois o usuário foi criado
        // O admin pode criar o profile manualmente depois
        return NextResponse.json(
          {
            success: true,
            warning: "Usuário criado, mas houve um problema ao criar o perfil. Verifique no Supabase.",
            user: {
              id: authData.user.id,
              email: authData.user.email,
              name,
              role,
            },
          },
          {
            headers: rateLimitResult
              ? {
                  "X-RateLimit-Limit": rateLimitResult.limit.toString(),
                  "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
                }
              : {},
          },
        )
      }
      
      console.log("[v0] Profile created successfully:", createdProfile)
    } else {
      console.log("[v0] Profile already exists:", newUserProfile)
    }

    const responseHeaders: Record<string, string> = {}
    if (rateLimitResult) {
      responseHeaders["X-RateLimit-Limit"] = rateLimitResult.limit.toString()
      responseHeaders["X-RateLimit-Remaining"] = rateLimitResult.remaining.toString()
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
        headers: responseHeaders,
      },
    )
  } catch (error: any) {
    console.error("[v0] API error:", error)
    console.error("[v0] API error stack:", error.stack)
    console.error("[v0] API error message:", error.message)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}

