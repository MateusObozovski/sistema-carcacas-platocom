"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { useAuth } from "@/lib/auth-context"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Use useCallback para manter a mesma referência da função
  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false)
  }, [])

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev)
  }, [])

  const publicPaths = ["/", "/login", "/setup"]
  const isPublicPath = publicPaths.includes(pathname)

  useEffect(() => {
    if (!isLoading && !user && !isPublicPath) {
      console.log("[v0] DashboardLayout: No user, redirecting to login")
      router.push("/login")
    }
  }, [user, isLoading, isPublicPath, router])

  if (isPublicPath) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-sm text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader onMenuClick={handleToggleSidebar} />
        <div className="flex flex-1">
          <DashboardNav isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    )
  }

  return null
}
