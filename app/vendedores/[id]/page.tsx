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
import { mockVendedores, mockClientes, mockPedidos } from "@/lib/mock-data"
import Link from "next/link"
import { ArrowLeft, DollarSign, Package, Users, ShoppingCart } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatCard } from "@/components/stat-card"

export default function VendedorDetalhePage() {
  const params = useParams()
  const [pedidos, setPedidos] = useState(mockPedidos)

  useEffect(() => {
    const pedidosLocal = JSON.parse(localStorage.getItem("pedidos") || "[]")
    const todosPedidos = [...mockPedidos, ...pedidosLocal]
    setPedidos(todosPedidos)
  }, [])

  const vendedor = mockVendedores.find((v) => v.id === params.id)
  const clientesVendedor = mockClientes.filter((c) => c.vendedorId === params.id)
  const pedidosVendedor = pedidos.filter((p) => p.vendedorId === params.id)
  const pedidosPendentes = pedidosVendedor.filter(
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

  if (!vendedor) {
    return (
      <ProtectedRoute allowedRoles={["patrao", "gerente", "coordenador"]}>
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <div className="flex flex-1">
            <DashboardNav />
            <main className="flex-1 p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Vendedor não encontrado</h2>
                <Button className="mt-4" asChild>
                  <Link href="/vendedores">Voltar para Vendedores</Link>
                </Button>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["patrao", "gerente", "coordenador"]}>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <DashboardNav />
          <main className="flex-1 p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/vendedores">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">{vendedor.name}</h2>
                  <p className="text-muted-foreground">Detalhes e histórico do vendedor</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Débito Total"
                  value={formatCurrency(vendedor.debitoTotal)}
                  icon={DollarSign}
                  description="Total de débitos pendentes"
                />
                <StatCard
                  title="Carcaças Pendentes"
                  value={vendedor.carcacasPendentes}
                  icon={Package}
                  description="Aguardando devolução"
                />
                <StatCard
                  title="Clientes"
                  value={clientesVendedor.length}
                  icon={Users}
                  description="Total de clientes"
                />
                <StatCard
                  title="Total de Vendas"
                  value={pedidosVendedor.length}
                  icon={ShoppingCart}
                  description="Pedidos realizados"
                />
              </div>

              <Tabs defaultValue="clientes" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="clientes">Clientes</TabsTrigger>
                  <TabsTrigger value="carcacas">Carcaças Pendentes</TabsTrigger>
                  <TabsTrigger value="pedidos">Todos os Pedidos</TabsTrigger>
                </TabsList>

                <TabsContent value="clientes" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Clientes do Vendedor</CardTitle>
                      <CardDescription>Lista de clientes e seus débitos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Débito Total</TableHead>
                            <TableHead className="text-right">Carcaças Pendentes</TableHead>
                            <TableHead>Última Atualização</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientesVendedor.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                Nenhum cliente encontrado
                              </TableCell>
                            </TableRow>
                          ) : (
                            clientesVendedor.map((cliente) => (
                              <TableRow key={cliente.id}>
                                <TableCell className="font-medium">
                                  <Link href={`/clientes/${cliente.id}`} className="hover:underline">
                                    {cliente.name}
                                  </Link>
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(cliente.debitoTotal)}</TableCell>
                                <TableCell className="text-right">{cliente.carcacasPendentes}</TableCell>
                                <TableCell>{formatDate(cliente.ultimaAtualizacao)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="carcacas" className="space-y-4">
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
                            pedidosPendentes.map((pedido) => {
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
                </TabsContent>

                <TabsContent value="pedidos" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Todos os Pedidos</CardTitle>
                      <CardDescription>Histórico completo de vendas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pedido</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pedidosVendedor.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground">
                                Nenhum pedido encontrado
                              </TableCell>
                            </TableRow>
                          ) : (
                            pedidosVendedor.map((pedido) => {
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
                                  <TableCell>
                                    {pedido.tipoVenda === "base-troca" ? "Base de Troca" : "Normal"}
                                  </TableCell>
                                  <TableCell className="text-right">{formatCurrency(pedido.precoFinal)}</TableCell>
                                  <TableCell>{formatDate(pedido.dataCriacao)}</TableCell>
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
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
