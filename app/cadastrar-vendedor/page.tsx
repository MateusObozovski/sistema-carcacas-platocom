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
import type { User, UserRole } from "@/lib/types"

export default function CadastrarVendedorPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Vendedor" as UserRole,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newUser: User = {
      id: `user${Date.now()}`,
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
    }

    const stored = localStorage.getItem("users")
    const users: User[] = stored ? JSON.parse(stored) : []

    if (users.some((u) => u.email === formData.email)) {
      alert("Este email já está cadastrado!")
      return
    }

    users.push(newUser)
    localStorage.setItem("users", JSON.stringify(users))

    alert("Vendedor cadastrado com sucesso!")
    router.push("/usuarios")
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

              <Button type="submit" className="w-full">
                Cadastrar Vendedor
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </ProtectedRoute>
  )
}
