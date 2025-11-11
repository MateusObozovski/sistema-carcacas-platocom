"use client"

import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useEffect } from "react"
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  FileText,
  UserCircle,
  Building2,
  BarChart3,
  Box,
  UserPlus,
  Settings,
  Upload,
} from "lucide-react"

interface DashboardNavProps {
  isOpen: boolean
  onClose: () => void
}

export function DashboardNav({ isOpen, onClose }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  // Fecha o menu quando a rota mudar (só no mobile)
  useEffect(() => {
    if (pathname) {
      onClose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["Patrão", "Gerente", "Coordenador", "Vendedor"],
    },
    {
      title: "Vendedores",
      href: "/vendedores",
      icon: Users,
      roles: ["Patrão", "Gerente", "Coordenador"],
    },
    {
      title: "Clientes",
      href: "/clientes",
      icon: Building2,
      roles: ["Patrão", "Gerente", "Coordenador", "Vendedor"],
    },
    {
      title: "Pedidos",
      href: "/pedidos",
      icon: ShoppingCart,
      roles: ["Patrão", "Gerente", "Coordenador", "Vendedor"],
    },
    {
      title: "Carcaças Pendentes",
      href: "/carcacas-pendentes",
      icon: Package,
      roles: ["Patrão", "Gerente", "Coordenador", "Vendedor"],
    },
    {
      title: "Nova Venda",
      href: "/nova-venda",
      icon: FileText,
      roles: ["Patrão", "Gerente", "Coordenador", "Vendedor"],
    },
    {
      title: "Registrar Devolução",
      href: "/registrar-devolucao",
      icon: Package,
      roles: ["Patrão", "Gerente", "Coordenador", "Vendedor"],
    },
    {
      title: "Relatórios",
      href: "/relatorios",
      icon: BarChart3,
      roles: ["Patrão", "Gerente", "Coordenador"],
    },
    {
      title: "Produtos",
      href: "/produtos",
      icon: Box,
      roles: ["Patrão", "Gerente"],
    },
    {
      title: "Importar Produtos",
      href: "/importar-produtos",
      icon: Upload,
      roles: ["Patrão", "Gerente"],
    },
    {
      title: "Cadastrar Vendedor",
      href: "/cadastrar-vendedor",
      icon: UserPlus,
      roles: ["Patrão", "Gerente"],
    },
    {
      title: "Gestão de Usuários",
      href: "/usuarios",
      icon: Settings,
      roles: ["Patrão"],
    },
    {
      title: "Meu Perfil",
      href: "/perfil",
      icon: UserCircle,
      roles: ["Vendedor"],
    },
  ]

  const filteredNavItems = navItems.filter((item) => user && item.roles.includes(user.role))

  const handleNavClick = (href: string) => {
    router.push(href)
  }

  return (
    <>
      {/* Overlay escuro no mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <nav
        className={cn(
          "fixed left-0 top-0 bottom-0 w-64 border-r border-zinc-800 bg-zinc-900 p-4 pt-20 transition-transform duration-300 ease-in-out z-40",
          "lg:relative lg:pt-4 lg:!translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="space-y-1 overflow-y-auto h-full">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-left",
                  isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-zinc-800 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export default DashboardNav
