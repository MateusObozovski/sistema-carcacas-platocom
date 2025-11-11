"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { StatCard } from "@/components/stat-card"
import { useAuth } from "@/lib/auth-context"
import { mockVendedores, mockPedidos, mockClientes } from "@/lib/mock-data"
import { DollarSign, Package, Users, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const { user } = useAuth()

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

  // Patrão Dashboard
  if (user?.role === "Patrão" || user?.role === "Gerente" || user?.role === "Coordenador") {
    console.log("[v0] Rendering admin dashboard for role:", user.role)

    const debitoTotal = mockVendedores.reduce((acc, v) => acc + v.debitoTotal, 0)
    const carcacasPendentesTotal = mockVendedores.reduce((acc, v) => acc + v.carcacasPendentes, 0)
    const pedidosAtrasados = mockPedidos.filter((p) => p.statusCarcaca === "atrasado").length

    const pedidosPendentes = mockPedidos
      .filter((p) => p.statusCarcaca === "aguardando" || p.statusCarcaca === "atrasado")
      .sort((a, b) => new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime())
      .slice(0, 5)

    return (
      <ProtectedRoute allowedRoles={["Patrão", "Gerente", "Coordenador"]}>
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
                value={mockVendedores.length}
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
                      {mockVendedores
                        .sort((a, b) => b.debitoTotal - a.debitoTotal)
                        .map((vendedor) => (
                          <TableRow key={vendedor.id}>
                            <TableCell className="font-medium">
                              <Link href={`/vendedores/${vendedor.id}`} className="hover:underline">
                                {vendedor.name}
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
                        const cliente = mockClientes.find((c) => c.id === pedido.clienteId)
                        return (
                          <TableRow key={pedido.id}>
                            <TableCell className="font-mono text-sm">
                              <Link href={`/pedidos/${pedido.numero}`} className="hover:underline">
                                {pedido.numero}
                              </Link>
                            </TableCell>
                            <TableCell>{cliente?.name}</TableCell>
                            <TableCell>{getDaysPending(pedido.dataCriacao)}</TableCell>
                            <TableCell>
                              <StatusBadge status={pedido.statusCarcaca} />
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

    const vendedor = mockVendedores.find((v) => v.id === user.id)
    const meusClientes = mockClientes.filter((c) => c.vendedorId === user.id)
    const meusPedidos = mockPedidos.filter((p) => p.vendedorId === user.id)
    const pedidosPendentes = meusPedidos.filter(
      (p) => p.statusCarcaca === "aguardando" || p.statusCarcaca === "atrasado",
    )
    const pedidosAtrasados = meusPedidos.filter((p) => p.statusCarcaca === "atrasado").length

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
                value={formatCurrency(vendedor?.debitoTotal || 0)}
                icon={DollarSign}
                description="Total de débitos pendentes"
              />
              <StatCard
                title="Carcaças Pendentes"
                value={vendedor?.carcacasPendentes || 0}
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
                      {meusClientes
                        .sort((a, b) => b.debitoTotal - a.debitoTotal)
                        .map((cliente) => (
                          <TableRow key={cliente.id}>
                            <TableCell className="font-medium">
                              <Link href={`/clientes/${cliente.id}`} className="hover:underline">
                                {cliente.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(cliente.debitoTotal)}</TableCell>
                            <TableCell className="text-right">{cliente.carcacasPendentes}</TableCell>
                          </TableRow>
                        ))}
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
                        const cliente = mockClientes.find((c) => c.id === pedido.clienteId)
                        return (
                          <TableRow key={pedido.id}>
                            <TableCell className="font-mono text-sm">
                              <Link href={`/pedidos/${pedido.numero}`} className="hover:underline">
                                {pedido.numero}
                              </Link>
                            </TableCell>
                            <TableCell>{cliente?.name}</TableCell>
                            <TableCell>{getDaysPending(pedido.dataCriacao)}</TableCell>
                            <TableCell>
                              <StatusBadge status={pedido.statusCarcaca} />
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
