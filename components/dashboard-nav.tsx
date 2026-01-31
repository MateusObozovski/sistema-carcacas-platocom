"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  FileText,
  Building2,
  BarChart3,
  Box,
  Settings,
  ArrowRightLeft,
  PackageCheck,
  Truck,
  Receipt,
} from "lucide-react";

interface DashboardNavProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function DashboardNav({ isOpen, onClose }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Fecha o menu quando a rota mudar (só no mobile)
  useEffect(() => {
    if (pathname && onClose) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const navItems = [
    // 📊 Visão Geral
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "Gerente", "Coordenador", "Vendedor"],
    },
    // 💰 Módulo de Vendas
    {
      title: "Nova Venda",
      href: "/nova-venda",
      icon: FileText,
      roles: ["admin", "Gerente", "Coordenador", "Vendedor"],
    },
    {
      title: "Pedidos",
      href: "/pedidos",
      icon: ShoppingCart,
      roles: ["admin", "Gerente", "Coordenador", "Vendedor"],
    },
    {
      title: "Carcaças Pendentes",
      href: "/carcacas-pendentes",
      icon: Package,
      roles: ["admin", "Gerente", "Coordenador", "Vendedor"],
    },
    // 📦 Módulo de Compras e Estoque
    {
      title: "Entrada de Mercadoria",
      href: "/entrada-mercadoria",
      icon: PackageCheck,
      roles: ["admin", "Gerente", "Coordenador", "Vendedor", "operador"],
    },
    {
      title: "Vincular Entrada",
      href: "/vincular-entrada",
      icon: ArrowRightLeft,
      roles: ["admin", "Gerente", "Coordenador", "Vendedor"],
    },
    {
      title: "Notas de Compra",
      href: "/notas-compra",
      icon: Receipt,
      roles: ["admin", "Gerente", "Coordenador"],
    },
    // 📋 Cadastros
    {
      title: "Clientes",
      href: "/clientes",
      icon: Building2,
      roles: ["admin", "Gerente", "Coordenador", "Vendedor"],
    },
    {
      title: "Produtos",
      href: "/produtos",
      icon: Box,
      roles: ["admin", "Gerente"],
    },
    {
      title: "Fornecedores",
      href: "/fornecedores",
      icon: Truck,
      roles: ["admin", "Gerente", "Coordenador"],
    },
    {
      title: "Vendedores",
      href: "/vendedores",
      icon: Users,
      roles: ["admin", "Gerente", "Coordenador"],
    },
    // 📊 Análise e Configurações
    {
      title: "Relatórios",
      href: "/relatorios",
      icon: BarChart3,
      roles: ["admin", "Gerente", "Coordenador"],
    },
    {
      title: "Gestão de Usuários",
      href: "/usuarios",
      icon: Settings,
      roles: ["admin"],
    },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!user) {
      console.warn("[v0] DashboardNav - No user found");
      return false;
    }

    // Se for operador, só mostra "Entrada de Mercadoria"
    if (user.role === "operador") {
      return item.href === "/entrada-mercadoria";
    }

    const hasAccess = item.roles.includes(user.role);
    // Remover log de erro desnecessário - admin pode não ter acesso a alguns itens específicos
    return hasAccess;
  });

  const handleNavClick = (href: string) => {
    router.push(href);
  };

  return (
    <>
      {/* Overlay no mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => onClose?.()}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <nav
        className={cn(
          "fixed left-0 top-0 bottom-0 w-64 border-r border-brand-blue/20 bg-brand-blue p-4 pt-20 transition-transform duration-300 ease-in-out z-40 shadow-sm",
          "lg:relative lg:pt-4 lg:!translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="space-y-1 overflow-y-auto h-full">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-left",
                  isActive
                    ? "bg-brand-orange text-white"
                    : "text-white/90 hover:bg-brand-blue/80 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default DashboardNav;
