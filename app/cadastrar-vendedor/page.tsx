"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { UserRole } from "@/lib/types"

export default function CadastrarVendedorPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Vendedor" as UserRole,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Erro",
          description: data.error || "Não foi possível cadastrar o usuário",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      toast({
        title: "Sucesso",
        description: "Usuário cadastrado com sucesso!",
      })

      // Limpar formulário
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "Vendedor",
      })

      // Redirecionar após um breve delay
      setTimeout(() => {
        router.push("/usuarios")
      }, 1000)
    } catch (error: any) {
      console.error("[v0] Error creating user:", error)
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o usuário",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["Patrão", "Gerente"]}>
      <main className="p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Cadastrar Novo Vendedor</CardTitle>
            <CardDescription>Preencha os dados do novo vendedor ou usuário do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Nível de Acesso</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vendedor">Vendedor</SelectItem>
                    <SelectItem value="Coordenador">Coordenador</SelectItem>
                    <SelectItem value="Gerente">Gerente</SelectItem>
                    <SelectItem value="Patrão">Patrão (Admin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <h3 className="mb-2 text-sm font-medium">Níveis de Acesso:</h3>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Vendedor: Acesso a vendas, clientes e pedidos próprios</li>
                  <li>• Coordenador: Acesso a vendas e relatórios da equipe</li>
                  <li>• Gerente: Acesso completo exceto gestão de usuários</li>
                  <li>• Patrão: Acesso total ao sistema</li>
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Cadastrando..." : "Cadastrar Vendedor"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </ProtectedRoute>
  )
}
