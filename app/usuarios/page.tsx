"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Trash2, Lock } from "lucide-react"
import type { UserRole } from "@/lib/types"
import { getUsers, type DatabaseUser } from "@/lib/supabase/database"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

export default function UsuariosPage() {
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()
  const [users, setUsers] = useState<DatabaseUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true)
        const usersData = await getUsers()
        setUsers(usersData)
      } catch (error) {
        console.error("[v0] Error loading users:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os usuários",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [toast])

  const filteredUsers = users.filter(
    (user) =>
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDelete = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Erro",
        description: "Você não pode excluir seu próprio usuário!",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Tem certeza que deseja excluir este usuário?")) return

    try {
      // Delete user from Supabase Auth (requires admin privileges)
      // Note: This would typically be done via an API route with service role
      toast({
        title: "Atenção",
        description: "A exclusão de usuários deve ser feita pelo painel do Supabase ou via API com privilégios de administrador.",
        variant: "default",
      })
    } catch (error) {
      console.error("[v0] Error deleting user:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o usuário",
        variant: "destructive",
      })
    }
  }

  const handleResetPassword = async (userId: string, email: string) => {
    const newPassword = prompt("Digite a nova senha (mínimo 6 caracteres):")
    if (!newPassword) return

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter no mínimo 6 caracteres!",
        variant: "destructive",
      })
      return
    }

    try {
      // Reset password via Supabase Auth Admin API
      // Note: This would typically be done via an API route with service role
      toast({
        title: "Atenção",
        description: "O reset de senha deve ser feito pelo painel do Supabase ou via API com privilégios de administrador.",
        variant: "default",
      })
    } catch (error) {
      console.error("[v0] Error resetting password:", error)
      toast({
        title: "Erro",
        description: "Não foi possível resetar a senha",
        variant: "destructive",
      })
    }
  }

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<UserRole, { label: string; variant: "default" | "secondary" | "outline" }> = {
      Patrão: { label: "Patrão", variant: "default" },
      Gerente: { label: "Gerente", variant: "default" },
      Coordenador: { label: "Coordenador", variant: "secondary" },
      Vendedor: { label: "Vendedor", variant: "outline" },
    }
    return variants[role] || { label: role || "Desconhecido", variant: "outline" as const }
  }

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["Patrão"]}>
        <main className="p-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </main>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["Patrão"]}>
      <main className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestão de Usuários</h1>
            <p className="text-muted-foreground">Controle de acessos e permissões do sistema</p>
          </div>
          <Button onClick={() => router.push("/cadastrar-vendedor")} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Usuários do Sistema</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Nome</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Nível de Acesso</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-muted-foreground">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const roleBadge = getRoleBadge(user.role as UserRole)
                      return (
                        <tr key={user.id} className="border-b border-border">
                          <td className="py-4 text-sm font-medium text-foreground">{user.nome}</td>
                          <td className="py-4 text-sm text-muted-foreground">{user.email}</td>
                          <td className="py-4">
                            <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                          </td>
                          <td className="py-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResetPassword(user.id, user.email)}
                                title="Resetar senha"
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleDelete(user.id)}
                                disabled={user.id === currentUser?.id}
                                title="Excluir usuário"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
              <h3 className="mb-3 text-sm font-medium">Níveis de Acesso do Sistema:</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Patrão (Admin)</p>
                  <p className="text-xs text-muted-foreground">
                    Acesso total: gestão de usuários, produtos, relatórios e todas as funcionalidades
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Gerente</p>
                  <p className="text-xs text-muted-foreground">Acesso completo exceto gestão de usuários e produtos</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Coordenador</p>
                  <p className="text-xs text-muted-foreground">
                    Acesso a vendas, relatórios e gestão da equipe de vendedores
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Vendedor</p>
                  <p className="text-xs text-muted-foreground">Acesso a vendas, clientes e pedidos próprios apenas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </ProtectedRoute>
  )
}
