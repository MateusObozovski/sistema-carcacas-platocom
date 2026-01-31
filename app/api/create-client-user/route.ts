import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { rateLimitByIP, rateLimitConfigs } from "@/lib/rate-limit"
import { cookies } from "next/headers"

function getIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  return forwarded?.split(",")[0] || realIP || "unknown"
}

const createClientUserSchema = z.object({
  clientId: z.string().uuid("ID do cliente inválido"),
  codigoAcesso: z.string().min(3, "Código de acesso deve ter pelo menos 3 caracteres").max(50).trim(),
  senha: z
    .string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .max(100),
})

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
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

    // Verificar se o usuário tem permissão (admin ou Gerente)
    const { data: currentUserProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !currentUserProfile) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 403 })
    }

    const allowedRoles = ["admin", "Gerente", "Coordenador"]
    if (!allowedRoles.includes(currentUserProfile.role)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    // Rate limiting
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
      console.warn("[v0] Rate limiting error (continuing):", rateLimitError)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
    }

    let validatedData
    try {
      validatedData = createClientUserSchema.parse(body)
    } catch (error: any) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors || error.message },
        { status: 400 },
      )
    }

    const { clientId, codigoAcesso, senha } = validatedData

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Erro de configuração do servidor" },
        { status: 500 },
      )
    }

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

    // Buscar dados do cliente
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, nome, email")
      .eq("id", clientId)
      .single()

    if (clientError || !clientData) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    // Verificar se já existe usuário para este cliente
    const { data: existingClientUser } = await supabaseAdmin
      .from("client_users")
      .select("user_id")
      .eq("client_id", clientId)
      .maybeSingle()

    if (existingClientUser) {
      return NextResponse.json({ error: "Este cliente já possui acesso ao portal" }, { status: 409 })
    }

    // Usar código de acesso como email (codigo@portal.platocom.com.br)
    const portalEmail = `${codigoAcesso.toLowerCase()}@portal.platocom.com.br`

    // Verificar se o código de acesso já está em uso
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const emailExists = existingUser?.users?.some(u => u.email === portalEmail)

    if (emailExists) {
      return NextResponse.json({ error: "Este código de acesso já está em uso" }, { status: 409 })
    }

    // Criar usuário no Supabase Auth
    console.log("[v0] Creating client user with email:", portalEmail)
    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: portalEmail,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome: clientData.nome,
        role: "Cliente",
        client_id: clientId,
        codigo_acesso: codigoAcesso,
      },
    })

    if (createUserError) {
      console.error("[v0] Error creating client user:", createUserError)
      if (createUserError.message.includes("already registered") || createUserError.message.includes("already exists")) {
        return NextResponse.json({ error: "Este código de acesso já está em uso" }, { status: 409 })
      }
      return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 })
    }

    // Aguardar trigger
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Verificar/criar profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle()

    if (!profile) {
      const { error: createProfileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: authData.user.id,
          email: portalEmail,
          nome: clientData.nome,
          role: "Cliente",
        })

      if (createProfileError) {
        console.error("[v0] Error creating profile:", createProfileError)
      }
    }

    // Criar vinculação client_users
    const { error: linkError } = await supabaseAdmin
      .from("client_users")
      .insert({
        user_id: authData.user.id,
        client_id: clientId,
      })

    if (linkError) {
      console.error("[v0] Error linking client user:", linkError)
      // Tentar deletar o usuário criado para manter consistência
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: "Erro ao vincular usuário ao cliente" }, { status: 500 })
    }

    // Atualizar cliente com código de acesso
    await supabaseAdmin
      .from("clients")
      .update({
        codigo_acesso: codigoAcesso,
        portal_habilitado: true
      })
      .eq("id", clientId)

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
          email: portalEmail,
          name: clientData.nome,
          codigoAcesso,
        },
      },
      { headers: responseHeaders },
    )
  } catch (error: any) {
    console.error("[v0] API error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    )
  }
}
