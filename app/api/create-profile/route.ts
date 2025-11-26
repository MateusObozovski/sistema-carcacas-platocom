import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
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
    } catch (error: any) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors || error.message },
        { status: 400 },
      )
    }

    const { userId, email, name, role } = validatedData

    // Verificar se SUPABASE_SERVICE_ROLE_KEY está configurado
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[v0] SUPABASE_SERVICE_ROLE_KEY não configurado")
      return NextResponse.json({ error: "Erro de configuração do servidor" }, { status: 500 })
    }

    // Use service role to bypass RLS
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if profile already exists
    const { data: existing } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle()

    if (existing) {
      console.log("[v0] Profile already exists")
      return NextResponse.json({ success: true, profile: existing })
    }

    // Create the profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .insert([
        {
          id: userId,
          email,
          nome: name,
          role: role || "Vendedor",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating profile:", error)
      // Não expor detalhes internos do erro
      return NextResponse.json({ error: "Erro ao criar perfil" }, { status: 500 })
    }

    console.log("[v0] Profile created successfully:", profile?.id)
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
  } catch (error: any) {
    console.error("[v0] API error:", error)
    // Não expor detalhes internos
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
