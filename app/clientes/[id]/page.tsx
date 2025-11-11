"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import { mockClientes, mockVendedores, mockPedidos } from "@/lib/mock-data"
import Link from "next/link"
import { ArrowLeft, DollarSign, Package, ShoppingCart } from "lucide-react"
import { StatCard } from "@/components/stat-card"

export default function ClienteDetalhePage() {
  const params = useParams()
  const [pedidos, setPedidos] = useState(mockPedidos)

  useEffect(() => {
    const pedidosLocal = JSON.parse(localStorage.getItem("pedidos") || "[]")
    const todosPedidos = [...mockPedidos, ...pedidosLocal]
    setPedidos(todosPedidos)
  }, [])

  const cliente = mockClientes.find((c) => c.id === params.id)
  const vendedor = cliente ? mockVendedores.find((v) => v.id === cliente.vendedorId) : null
  const pedidosCliente = pedidos.filter((p) => p.clienteId === params.id)
  const pedidosPendentes = pedidosCliente.filter(
    (p) => p.statusCarcaca === "aguardando" || p.statusCarcaca === "atrasado",
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

  if (!cliente) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <div className="flex flex-1">
            <DashboardNav />
            <main className="flex-1 p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Cliente não encontrado</h2>
                <Button className="mt-4" asChild>
                  <Link href="/clientes">Voltar para Clientes</Link>
                </Button>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <DashboardNav />
          <main className="flex-1 p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/clientes">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">{cliente.name}</h2>
                  <p className="text-muted-foreground">Vendedor: {vendedor?.name}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  title="Débito Total"
                  value={formatCurrency(cliente.debitoTotal)}
                  icon={DollarSign}
                  description="Total de débitos pendentes"
                />
                <StatCard
                  title="Carcaças Pendentes"
                  value={cliente.carcacasPendentes}
                  icon={Package}
                  description="Aguardando devolução"
                />
                <StatCard
                  title="Total de Pedidos"
                  value={pedidosCliente.length}
                  icon={ShoppingCart}
                  description="Pedidos realizados"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Carcaças Pendentes</CardTitle>
                  <CardDescription>Pedidos aguardando devolução de carcaça</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Débito</TableHead>
                        <TableHead className="text-center">Dias Pendente</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidosPendentes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Nenhuma carcaça pendente
                          </TableCell>
                        </TableRow>
                      ) : (
                        pedidosPendentes.map((pedido) => (
                          <TableRow key={pedido.id}>
                            <TableCell className="font-mono text-sm">
                              <Link href={`/pedidos/${pedido.numero}`} className="hover:underline">
                                {pedido.numero}
                              </Link>
                            </TableCell>
                            <TableCell>{pedido.produto}</TableCell>
                            <TableCell className="text-right">{formatCurrency(pedido.debitoCarcaca)}</TableCell>
                            <TableCell className="text-center">{getDaysPending(pedido.dataCriacao)} dias</TableCell>
                            <TableCell>
                              <StatusBadge status={pedido.statusCarcaca} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Pedidos</CardTitle>
                  <CardDescription>Todos os pedidos do cliente</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidosCliente.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            Nenhum pedido encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        pedidosCliente.map((pedido) => (
                          <TableRow key={pedido.id}>
                            <TableCell className="font-mono text-sm">
                              <Link href={`/pedidos/${pedido.numero}`} className="hover:underline">
                                {pedido.numero}
                              </Link>
                            </TableCell>
                            <TableCell>{pedido.produto}</TableCell>
                            <TableCell>{pedido.tipoVenda === "base-troca" ? "Base de Troca" : "Normal"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(pedido.precoFinal)}</TableCell>
                            <TableCell>{formatDate(pedido.dataCriacao)}</TableCell>
                            <TableCell>
                              <StatusBadge status={pedido.statusCarcaca} />
                            </TableCell>
                          </TableRow>
                        ))
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
