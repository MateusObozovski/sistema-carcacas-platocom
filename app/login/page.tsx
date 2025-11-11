"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Package2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    console.log("[v0] Login form submitted")

    const success = await login(email, password)

    console.log("[v0] Login result:", success)

    if (success) {
      console.log("[v0] Redirecting to dashboard...")
      router.push("/dashboard")
    } else {
      setError("Email ou senha inválidos. Verifique suas credenciais e tente novamente.")
    }

    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Package2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Sistema de Carcaças</CardTitle>
            <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="rounded-lg bg-blue-950 border border-blue-800 p-4 text-sm">
              <p className="font-medium text-blue-400 mb-2">Primeira vez?</p>
              <p className="text-blue-300 text-sm mb-3">Execute o setup inicial para criar os usuários do sistema.</p>
              <Button
                type="button"
                variant="outline"
                className="w-full border-blue-700 text-blue-400 hover:bg-blue-900 bg-transparent"
                onClick={() => router.push("/setup")}
              >
                Ir para Setup Inicial
              </Button>
            </div>

            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium">Usuários de teste:</p>
              <div className="space-y-1 text-muted-foreground">
                <p>Patrão: patrao@empresa.com / admin123</p>
                <p>Gerente: gerente@empresa.com / gerente123</p>
                <p>Yago: yago@empresa.com / yago123</p>
                <p>José: jose@empresa.com / jose123</p>
                <p>Maria: maria@empresa.com / maria123</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
