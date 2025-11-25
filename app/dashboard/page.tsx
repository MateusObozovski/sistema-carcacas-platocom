"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { StatCard } from "@/components/stat-card"
import { useAuth } from "@/lib/auth-context"
import { getVendedores, getOrders, getClients, type DatabaseVendedor } from "@/lib/supabase/database"
import { DollarSign, Package, Users, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Helper function to map database status to StatusBadge status
function mapStatusToBadge(status: string): "aguardando" | "atrasado" | "devolvida" | "perda-total" {
  if (status === "Aguardando Devolução") return "aguardando"
  if (status === "Atrasado") return "atrasado"
  if (status === "Concluído") return "devolvida"
  if (status === "Perda Total") return "perda-total"
  return "aguardando"
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [vendedores, setVendedores] = useState<DatabaseVendedor[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!user) return

      try {
        setIsLoading(true)

        if (user.role === "admin" || user.role === "Gerente" || user.role === "Coordenador") {
          const [vendedoresData, ordersData, clientsData] = await Promise.all([
            getVendedores(),
            getOrders(),
            getClients(),
          ])
          setVendedores(vendedoresData)
          setOrders(ordersData)
          setClients(clientsData)
        } else if (user.role === "Vendedor") {
          const [vendedoresData, ordersData, clientsData] = await Promise.all([
            getVendedores(),
            getOrders(user.id),
            getClients(user.id),
          ])
          setVendedores(vendedoresData)
          setOrders(ordersData)
          setClients(clientsData)
        }
      } catch (error) {
        console.error("[v0] Error loading dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user])

  console.log("[v0] Dashboard rendering, user:", user)

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
      <ProtectedRoute>
        <div className="p-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </div>
      </ProtectedRoute>
    )
  }

  // Admin Dashboard
  if (user?.role === "admin" || user?.role === "Gerente" || user?.role === "Coordenador") {
    console.log("[v0] Rendering admin dashboard for role:", user.role)

    const debitoTotal = vendedores.reduce((acc, v) => acc + v.debitoTotal, 0)
    const carcacasPendentesTotal = vendedores.reduce((acc, v) => acc + v.carcacasPendentes, 0)
    const pedidosAtrasados = orders.filter((p) => p.status === "Atrasado").length

    const pedidosPendentes = orders
      .filter((p) => p.status === "Aguardando Devolução" || p.status === "Atrasado")
      .sort((a, b) => new Date(a.data_venda).getTime() - new Date(b.data_venda).getTime())
      .slice(0, 5)

    return (
      <ProtectedRoute allowedRoles={["admin", "Gerente", "Coordenador"]}>
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Dashboard Geral</h2>
              <p className="text-muted-foreground">Visão geral do sistema de carcaças</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Débito Total"
                value={formatCurrency(debitoTotal)}
                icon={DollarSign}
                description="Soma de todos os débitos"
              />
              <StatCard
                title="Carcaças Pendentes"
                value={carcacasPendentesTotal}
                icon={Package}
                description="Total aguardando devolução"
              />
              <StatCard
                title="Vendedores Ativos"
                value={vendedores.length}
                icon={Users}
                description="Total de vendedores"
              />
              <StatCard
                title="Pedidos Atrasados"
                value={pedidosAtrasados}
                icon={AlertTriangle}
                description="Mais de 30 dias"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Débito por Vendedor</CardTitle>
                  <CardDescription>Ranking de débitos pendentes</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="text-right">Débito</TableHead>
                        <TableHead className="text-right">Carcaças</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendedores
                        .sort((a, b) => b.debitoTotal - a.debitoTotal)
                        .map((vendedor) => (
                          <TableRow key={vendedor.id}>
                            <TableCell className="font-medium">
                              <Link href={`/vendedores/${vendedor.id}`} className="hover:underline">
                                {vendedor.nome}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(vendedor.debitoTotal)}</TableCell>
                            <TableCell className="text-right">{vendedor.carcacasPendentes}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pedidos Aguardando Devolução</CardTitle>
                  <CardDescription>Últimos pedidos pendentes</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidosPendentes.map((pedido) => {
                        const cliente = clients.find((c) => c.id === pedido.cliente_id)
                        return (
                          <TableRow key={pedido.id}>
                            <TableCell className="font-mono text-sm">
                              <Link href={`/pedidos/${pedido.numero_pedido}`} className="hover:underline">
                                {pedido.numero_pedido}
                              </Link>
                            </TableCell>
                            <TableCell>{cliente?.nome}</TableCell>
                            <TableCell>{getDaysPending(pedido.data_venda)}</TableCell>
                            <TableCell>
                              <StatusBadge status={mapStatusToBadge(pedido.status)} />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  <div className="mt-4">
                    <Button variant="outline" className="w-full bg-transparent" asChild>
                      <Link href="/carcacas-pendentes">Ver Todas as Carcaças Pendentes</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Vendedor Dashboard
  if (user?.role === "Vendedor") {
    console.log("[v0] Rendering vendedor dashboard")

    // Get vendedor stats
    const vendedorStats = vendedores.find((v) => v.id === user.id) || {
      debitoTotal: 0,
      carcacasPendentes: 0,
    }
    const meusClientes = clients
    const meusPedidos = orders
    const pedidosPendentes = meusPedidos.filter(
      (p) => p.status === "Aguardando Devolução" || p.status === "Atrasado",
    )
    const pedidosAtrasados = meusPedidos.filter((p) => p.status === "Atrasado").length

    return (
      <ProtectedRoute allowedRoles={["Vendedor"]}>
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Meu Dashboard</h2>
              <p className="text-muted-foreground">Visão geral das suas vendas e débitos</p>
            </div>

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
                title="Pedidos Atrasados"
                value={pedidosAtrasados}
                icon={AlertTriangle}
                description="Mais de 30 dias"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Meus Clientes</CardTitle>
                  <CardDescription>Débitos por cliente</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Débito</TableHead>
                        <TableHead className="text-right">Carcaças</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meusClientes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            Nenhum cliente encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        meusClientes.map((cliente) => {
                          // Calculate stats for each client
                          const clientePedidos = meusPedidos.filter((p) => p.cliente_id === cliente.id)
                          const clienteDebito = clientePedidos
                            .filter((p) => p.status === "Aguardando Devolução" || p.status === "Atrasado")
                            .reduce((sum, p) => sum + (p.debito_carcaca || 0), 0)
                          const clienteCarcacas = clientePedidos.filter(
                            (p) => p.status === "Aguardando Devolução" || p.status === "Atrasado",
                          ).length

                          return (
                            <TableRow key={cliente.id}>
                              <TableCell className="font-medium">
                                <Link href={`/clientes/${cliente.id}`} className="hover:underline">
                                  {cliente.nome}
                                </Link>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(clienteDebito)}</TableCell>
                              <TableCell className="text-right">{clienteCarcacas}</TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Carcaças Pendentes</CardTitle>
                  <CardDescription>Pedidos aguardando devolução</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidosPendentes.slice(0, 5).map((pedido) => {
                        const cliente = meusClientes.find((c) => c.id === pedido.cliente_id)
                        return (
                          <TableRow key={pedido.id}>
                            <TableCell className="font-mono text-sm">
                              <Link href={`/pedidos/${pedido.numero_pedido}`} className="hover:underline">
                                {pedido.numero_pedido}
                              </Link>
                            </TableCell>
                            <TableCell>{cliente?.nome}</TableCell>
                            <TableCell>{getDaysPending(pedido.data_venda)}</TableCell>
                            <TableCell>
                              <StatusBadge status={mapStatusToBadge(pedido.status)} />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  <div className="mt-4">
                    <Button variant="outline" className="w-full bg-transparent" asChild>
                      <Link href="/carcacas-pendentes">Ver Todas</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  console.log("[v0] No dashboard matched for role:", user?.role)
  return null
}
