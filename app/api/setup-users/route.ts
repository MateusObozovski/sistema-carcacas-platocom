import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// This route uses the service role key to create users
// Only run this once during initial setup
export async function POST() {
  try {
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
          nome: "Patrão Admin",
          role: "Patrão",
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
        results.push({ email: userData.email, status: "error", error: error.message })
      } else {
        console.log(`User created: ${userData.email}`)
        results.push({ email: userData.email, status: "success", id: data.user?.id })
      }
    }

    return NextResponse.json({
      success: true,
      message: "User setup completed",
      results,
    })
  } catch (error: any) {
    console.error("Setup error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
