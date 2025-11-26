import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"

// Esta rota cria os usuários padrão e exclui todos os outros
// ATENÇÃO: Esta operação é destrutiva e deve ser usada apenas em desenvolvimento/setup inicial
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
      return NextResponse.json({ error: "Acesso negado. Apenas administradores podem executar esta operação." }, { status: 403 })
    }

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

    // Lista de usuários padrão a manter/criar
    const defaultUsers = [
      {
        email: "admin@teste.com",
        password: "admin123",
        nome: "Admin",
        role: "admin" as const,
      },
      {
        email: "gerente@teste.com",
        password: "gerente123",
        nome: "Gerente",
        role: "Gerente" as const,
      },
      {
        email: "coordenador@teste.com",
        password: "coordenador123",
        nome: "Coordenador",
        role: "Coordenador" as const,
      },
      {
        email: "vendedor@teste.com",
        password: "vendedor123",
        nome: "Vendedor",
        role: "Vendedor" as const,
      },
    ]

    const defaultEmails = defaultUsers.map((u) => u.email.toLowerCase())

    // Buscar todos os usuários do Supabase Auth
    const { data: { users: allAuthUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      console.error("[v0] Error listing users:", listError)
      return NextResponse.json({ error: "Erro ao listar usuários" }, { status: 500 })
    }

    const results = {
      created: [] as Array<{ email: string; id: string }>,
      deleted: [] as Array<{ email: string; id: string }>,
      existing: [] as Array<{ email: string; id: string }>,
      errors: [] as Array<{ email: string; error: string }>,
    }

    // Processar cada usuário padrão
    for (const userData of defaultUsers) {
      const existingUser = allAuthUsers?.find((u) => u.email?.toLowerCase() === userData.email.toLowerCase())

      if (existingUser) {
        // Usuário existe, atualizar senha e role se necessário
        console.log(`[v0] User ${userData.email} already exists, updating...`)

        // Atualizar senha
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: userData.password,
        })

        if (updateError) {
          console.error(`[v0] Error updating user ${userData.email}:`, updateError)
          results.errors.push({ email: userData.email, error: `Erro ao atualizar: ${updateError.message}` })
        } else {
          // Verificar e atualizar profile
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", existingUser.id)
            .single()

          if (profile) {
            // Atualizar profile se necessário
            const { error: profileUpdateError } = await supabaseAdmin
              .from("profiles")
              .update({
                nome: userData.nome,
                role: userData.role,
                email: userData.email,
              })
              .eq("id", existingUser.id)

            if (profileUpdateError) {
              console.error(`[v0] Error updating profile for ${userData.email}:`, profileUpdateError)
            }
          } else {
            // Criar profile se não existir
            const { error: profileCreateError } = await supabaseAdmin.from("profiles").insert({
              id: existingUser.id,
              email: userData.email,
              nome: userData.nome,
              role: userData.role,
            })

            if (profileCreateError) {
              console.error(`[v0] Error creating profile for ${userData.email}:`, profileCreateError)
            }
          }

          results.existing.push({ email: userData.email, id: existingUser.id })
        }
      } else {
        // Criar novo usuário
        console.log(`[v0] Creating new user: ${userData.email}`)
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            nome: userData.nome,
            role: userData.role,
          },
        })

        if (createError) {
          console.error(`[v0] Error creating user ${userData.email}:`, createError)
          results.errors.push({ email: userData.email, error: `Erro ao criar: ${createError.message}` })
        } else if (newUser.user) {
          // Aguardar um pouco para o trigger criar o profile
          await new Promise((resolve) => setTimeout(resolve, 500))

          // Verificar se o profile foi criado
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", newUser.user.id)
            .single()

          if (!profile) {
            // Criar profile manualmente se o trigger não criou
            const { error: profileError } = await supabaseAdmin.from("profiles").insert({
              id: newUser.user.id,
              email: userData.email,
              nome: userData.nome,
              role: userData.role,
            })

            if (profileError) {
              console.error(`[v0] Error creating profile for ${userData.email}:`, profileError)
            }
          }

          results.created.push({ email: userData.email, id: newUser.user.id })
        }
      }
    }

    // Excluir todos os outros usuários
    if (allAuthUsers) {
      for (const authUser of allAuthUsers) {
        const userEmail = authUser.email?.toLowerCase()
        if (userEmail && !defaultEmails.includes(userEmail)) {
          console.log(`[v0] Deleting user: ${userEmail}`)
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id)

          if (deleteError) {
            console.error(`[v0] Error deleting user ${userEmail}:`, deleteError)
            results.errors.push({ email: userEmail || authUser.id, error: `Erro ao excluir: ${deleteError.message}` })
          } else {
            results.deleted.push({ email: userEmail || authUser.id, id: authUser.id })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Usuários configurados com sucesso",
      results: {
        created: results.created.length,
        existing: results.existing.length,
        deleted: results.deleted.length,
        errors: results.errors.length,
      },
      details: {
        created: results.created,
        existing: results.existing,
        deleted: results.deleted,
        errors: results.errors,
      },
    })
  } catch (error: any) {
    console.error("[v0] API error:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}

