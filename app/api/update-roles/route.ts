import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { NextRequest } from "next/server"

// Esta rota atualiza os roles antigos "Patrão" para "admin"
// Apenas usuários admin podem executar esta operação
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

    // Verificar se o usuário tem role admin (aceita tanto "admin" quanto "Patrão" para permitir a migração)
    const { data: currentUserProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (
      profileError ||
      !currentUserProfile ||
      (currentUserProfile.role !== "admin" && currentUserProfile.role !== "Patrão")
    ) {
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

    // Tentar usar a função RPC se existir
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("update_patrao_to_admin")

    if (rpcError) {
      // Se a função não existir, vamos buscar os perfis que precisam ser atualizados
      // e instruir o usuário a executar o SQL manualmente
      console.log("[v0] RPC function não encontrada, verificando perfis que precisam atualização...")

      const { data: profilesToUpdate, error: fetchError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, nome, role")
        .in("role", ["Patrão", "patrão", "Patrao", "patrao", "PATRÃO", "PATRAO"])

      if (fetchError) {
        console.error("[v0] Error fetching profiles:", fetchError)
        return NextResponse.json(
          {
            success: false,
            error: "Erro ao buscar perfis. Execute o script SQL manualmente no Supabase.",
            sql_script: "scripts/007_update_patrao_to_admin.sql",
            instructions:
              "1. Execute o script 008_create_update_roles_function.sql no SQL Editor do Supabase\n2. Depois execute novamente esta atualização, ou\n3. Execute diretamente o script 007_update_patrao_to_admin.sql",
          },
          { status: 500 },
        )
      }

      if (!profilesToUpdate || profilesToUpdate.length === 0) {
        return NextResponse.json({
          success: true,
          message: "Nenhum perfil precisa ser atualizado",
          updated: 0,
          profiles: [],
        })
      }

      return NextResponse.json({
        success: false,
        error: "A constraint do banco está impedindo a atualização automática.",
        sql_script: "scripts/007_update_patrao_to_admin.sql",
        function_script: "scripts/008_create_update_roles_function.sql",
        profiles_that_need_update: profilesToUpdate,
        instructions:
          "Execute primeiro o script 008_create_update_roles_function.sql no SQL Editor do Supabase, depois tente novamente. Ou execute diretamente o script 007_update_patrao_to_admin.sql.",
      })
    }

    // Se chegou aqui, a função RPC foi executada com sucesso
    return NextResponse.json({
      success: true,
      message: "Roles atualizados com sucesso",
      updated: rpcResult?.[0]?.updated_count || 0,
      profiles: rpcResult?.[0]?.updated_profiles || [],
    })
  } catch (error: any) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

