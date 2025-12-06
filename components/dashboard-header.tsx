"use client"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut, User, Menu } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DashboardHeaderProps {
  onMenuClick?: () => void
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    // Aguardar um pouco para garantir limpeza completa
    await new Promise(resolve => setTimeout(resolve, 100))
    router.push("/login")
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      gerente: "Gerente",
      coordenador: "Coordenador",
      vendedor: "Vendedor",
    }
    return labels[role] || role
  }

  return (
    <header className="sticky top-0 z-50 border-b border-brand-blue/20 bg-brand-blue shadow-sm">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        {/* Botão hambúrguer - só aparece no mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-white hover:bg-brand-blue/80"
            onClick={() => {
    console.log("Hamburger clicked!") // ← ADICIONE ESTA LINHA
    onMenuClick?.()
  }}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo e Título */}
        <div className="flex-1 flex items-center gap-3">
          <div className="relative h-10 w-32 flex-shrink-0">
            <Image
              src="/logo-sem-fundo.png"
              alt="PLATOCOM EMBREAGENS"
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
          <div className="flex-1">
            <h1 className="text-lg lg:text-xl font-semibold text-white">Sistema de Carcaças</h1>
            <p className="hidden sm:block text-sm text-white/80">Controle de débitos e devoluções</p>
          </div>
        </div>

        {/* Menu de usuário */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-brand-blue/80 border-white/20 text-white hover:bg-brand-blue/60"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user?.name || user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border-gray-200 shadow-lg">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-slate-800">{user?.name || user?.email}</p>
                  {user?.email && user?.name && (
                    <p className="text-xs text-slate-600">{user.email}</p>
                  )}
                  <p className="text-xs text-slate-600">{user && getRoleLabel(user.role)}</p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2 bg-brand-blue/80 border-white/20 text-white hover:bg-red-600 hover:border-red-600"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader
