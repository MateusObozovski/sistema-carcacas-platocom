"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { mockVendedores, mockClientes, mockPedidos } from "@/lib/mock-data"
import { StatCard } from "@/components/stat-card"
import { DollarSign, Package, Users, ShoppingCart } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import Link from "next/link"

export default function PerfilPage() {
  const { user } = useAuth()
  const [pedidos, setPedidos] = useState(mockPedidos)

  useEffect(() => {
    const pedidosLocal = JSON.parse(localStorage.getItem("pedidos") || "[]")
    const todosPedidos = [...mockPedidos, ...pedidosLocal]
    setPedidos(todosPedidos)
  }, [])

  const vendedor = mockVendedores.find((v) => v.id === user?.id)
  const meusClientes = mockClientes.filter((c) => c.vendedorId === user?.id)
  const meusPedidos = pedidos.filter((p) => p.vendedorId === user?.id)
  const pedidosPendentes = meusPedidos.filter((p) => p.statusCarcaca === "aguardando" || p.statusCarcaca === "atrasado")

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

  return (
    <ProtectedRoute allowedRoles={["vendedor"]}>
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
                          const cliente = mockClientes.find((c) => c.id === pedido.clienteId)
                          return (
                            <TableRow key={pedido.id}>
                              <TableCell className="font-mono text-sm">
                                <Link href={`/pedidos/${pedido.numero}`} className="hover:underline">
                                  {pedido.numero}
                                </Link>
                              </TableCell>
                              <TableCell>{cliente?.name}</TableCell>
                              <TableCell>{pedido.produto}</TableCell>
                              <TableCell className="text-right">{formatCurrency(pedido.debitoCarcaca)}</TableCell>
                              <TableCell className="text-center">{getDaysPending(pedido.dataCriacao)}</TableCell>
                              <TableCell>
                                <StatusBadge status={pedido.statusCarcaca} />
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
