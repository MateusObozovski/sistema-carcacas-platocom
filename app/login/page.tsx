"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

    try {
      console.log("[v0] Login form submitted")

      const result = await login(email, password)

      console.log("[v0] Login result:", result)

      if (result.success && result.user) {
        // Redirecionar baseado no role do usuário
        const redirectPath = result.user.role === "Cliente" ? "/portal-cliente" : "/dashboard"
        console.log("[v0] Redirecting to", redirectPath, "for role:", result.user.role)
        // Pequeno delay para garantir que o estado foi atualizado
        setTimeout(() => {
          router.push(redirectPath)
        }, 100)
      } else {
        // Verificar no console qual foi o erro específico
        if (result.error === "Invalid login credentials") {
          setError("Usuário ou senha incorretos!")
        } else {
          setError(result.error || "Não foi possível fazer login. Verifique o console do navegador para mais detalhes.")
        }
      }
    } catch (error) {
      console.error("[v0] Login error:", error)
      setError("Erro inesperado ao fazer login. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex items-center justify-center mb-4">
            <Image
              src="/logo-sem-fundo.png"
              alt="PLATOCOM EMBREAGENS"
              width={300}
              height={150}
              className="object-contain"
              priority
              unoptimized
            />
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
        </CardContent>
      </Card>
    </div>
  )
}
