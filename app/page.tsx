"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.role === "operador") {
          router.push("/entrada-mercadoria")
        } else {
          router.push("/dashboard")
        }
      } else {
        router.push("/login")
      }
    }
  }, [user, isLoading, router])

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-orange border-t-transparent" />
        <p className="mt-4 text-sm text-slate-600">Carregando sistema...</p>
      </div>
    </div>
  )
}
