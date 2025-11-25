"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { getVendedorStats, getClients, getOrders } from "@/lib/supabase/database"
import { StatCard } from "@/components/stat-card"
import { DollarSign, Package, Users, ShoppingCart } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import Link from "next/link"

// Helper function to map database status to StatusBadge status
function mapStatusToBadge(status: string): "aguardando" | "atrasado" | "devolvida" | "perda-total" {
  if (status === "Aguardando Devolução") return "aguardando"
  if (status === "Atrasado") return "atrasado"
  if (status === "Concluído") return "devolvida"
  if (status === "Perda Total") return "perda-total"
  return "aguardando"
}

export default function PerfilPage() {
  const { user } = useAuth()
  const [vendedorStats, setVendedorStats] = useState({ debitoTotal: 0, carcacasPendentes: 0 })
  const [meusClientes, setMeusClientes] = useState<any[]>([])
  const [meusPedidos, setMeusPedidos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return

      try {
        setIsLoading(true)
        const [stats, clientes, pedidos] = await Promise.all([
          getVendedorStats(user.id),
          getClients(user.id),
          getOrders(user.id),
        ])

        setVendedorStats(stats)
        setMeusClientes(clientes)
        setMeusPedidos(pedidos)
      } catch (error) {
        console.error("[v0] Error loading perfil data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user?.id])

  const pedidosPendentes = meusPedidos.filter(
    (p) => p.status === "Aguardando Devolução" || p.status === "Atrasado",
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const getDaysPending = (dataCriacao: string) => {
    const created = new Date(dataCriacao)
    const now = new Date()
    const diff = now.getTime() - created.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["Vendedor"]}>
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <div className="flex flex-1">
            <DashboardNav />
            <main className="flex-1 p-6">
              <div className="text-center text-muted-foreground">Carregando...</div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["Vendedor"]}>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <DashboardNav />
          <main className="flex-1 p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Meu Perfil</h2>
                <p className="text-muted-foreground">Informações da sua conta e desempenho</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{user?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Função</p>
                    <p className="font-medium">Vendedor</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Meu Débito Total"
                  value={formatCurrency(vendedorStats.debitoTotal)}
                  icon={DollarSign}
                  description="Total de débitos pendentes"
                />
                <StatCard
                  title="Carcaças Pendentes"
                  value={vendedorStats.carcacasPendentes}
                  icon={Package}
                  description="Aguardando devolução"
                />
                <StatCard
                  title="Meus Clientes"
                  value={meusClientes.length}
                  icon={Users}
                  description="Total de clientes ativos"
                />
                <StatCard
                  title="Total de Vendas"
                  value={meusPedidos.length}
                  icon={ShoppingCart}
                  description="Pedidos realizados"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Carcaças Pendentes</CardTitle>
                  <CardDescription>Seus pedidos aguardando devolução</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Débito</TableHead>
                        <TableHead className="text-center">Dias</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidosPendentes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhuma carcaça pendente
                          </TableCell>
                        </TableRow>
                      ) : (
                        pedidosPendentes.slice(0, 10).map((pedido) => {
                          const cliente = meusClientes.find((c) => c.id === pedido.cliente_id)
                          const primeiroItem = pedido.order_items?.[0]
                          return (
                            <TableRow key={pedido.id}>
                              <TableCell className="font-mono text-sm">
                                <Link href={`/pedidos/${pedido.numero_pedido}`} className="hover:underline">
                                  {pedido.numero_pedido}
                                </Link>
                              </TableCell>
                              <TableCell>{cliente?.nome}</TableCell>
                              <TableCell>{primeiroItem?.produto_nome || "-"}</TableCell>
                              <TableCell className="text-right">{formatCurrency(pedido.debito_carcaca || 0)}</TableCell>
                              <TableCell className="text-center">{getDaysPending(pedido.data_venda)}</TableCell>
                              <TableCell>
                                <StatusBadge status={mapStatusToBadge(pedido.status)} />
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
