import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { rateLimitByIP } from "@/lib/rate-limit"

// Helper para obter IP do request
function getIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  return forwarded?.split(",")[0] || realIP || "unknown"
}

// This route uses the service role key to create users
// Only run this once during initial setup
export async function POST(request: Request) {
  try {
    // Rate limiting muito restritivo para esta rota sensível
    const ip = getIP(request)
    const rateLimitResult = await rateLimitByIP(ip, {
      interval: 3600000, // 1 hora
      uniqueTokenPerInterval: 1, // apenas 1 execução por hora
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Esta operação só pode ser executada uma vez por hora.",
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

    // Verificar se SUPABASE_SERVICE_ROLE_KEY está configurado
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[v0] SUPABASE_SERVICE_ROLE_KEY não configurado")
      return NextResponse.json({ error: "Erro de configuração do servidor" }, { status: 500 })
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const users = [
      {
        email: "patrao@empresa.com",
        password: "admin123",
        user_metadata: {
          nome: "Admin",
          role: "admin",
        },
      },
      {
        email: "gerente@empresa.com",
        password: "gerente123",
        user_metadata: {
          nome: "Gerente Silva",
          role: "Gerente",
        },
      },
      {
        email: "yago@empresa.com",
        password: "yago123",
        user_metadata: {
          nome: "Yago Vendedor",
          role: "Vendedor",
        },
      },
      {
        email: "jose@empresa.com",
        password: "jose123",
        user_metadata: {
          nome: "José Vendedor",
          role: "Vendedor",
        },
      },
      {
        email: "maria@empresa.com",
        password: "maria123",
        user_metadata: {
          nome: "Maria Coordenadora",
          role: "Coordenador",
        },
      },
    ]

    const results = []

    for (const userData of users) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: userData.user_metadata,
      })

      if (error) {
        console.error(`Error creating user ${userData.email}:`, error)
        results.push({ email: userData.email, status: "error", error: "Erro ao criar usuário" })
      } else {
        console.log(`User created: ${userData.email}`)
        results.push({ email: userData.email, status: "success", id: data.user?.id })
      }
    }

    return NextResponse.json({
      success: true,
      message: "User setup completed",
      results: results.map((r) => ({
        email: r.email,
        status: r.status,
        ...(r.id && { id: r.id }),
      })),
    })
  } catch (error: any) {
    console.error("Setup error:", error)
    // Não expor detalhes internos
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
