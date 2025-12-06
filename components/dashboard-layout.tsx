"use client";

import type React from "react";
import { useState, useCallback, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardNav } from "@/components/dashboard-nav";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Use useCallback para manter a mesma referência da função
  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const publicPaths = ["/", "/login", "/setup"];
  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    // Se for operador, só pode acessar /entrada-mercadoria
    if (
      !isLoading &&
      user &&
      user.role === "operador" &&
      pathname !== "/entrada-mercadoria" &&
      !isPublicPath
    ) {
      console.log(
        "[v0] DashboardLayout: Operador trying to access restricted page, redirecting to entrada-mercadoria"
      );
      window.location.href = "/entrada-mercadoria";
    }
  }, [user, isLoading, isPublicPath, pathname]);

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-orange border-t-transparent"></div>
          <p className="mt-4 text-sm text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader onMenuClick={handleToggleSidebar} />
        <div className="flex flex-1">
          <DashboardNav isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
          <main className="flex-1 overflow-auto bg-background p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-slate-600">
        Sessão inválida. Atualize a página ou faça login novamente.
      </p>
    </div>
  );
}
