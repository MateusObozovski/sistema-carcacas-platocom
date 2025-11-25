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
import { getVendedorById, getClients, getOrders, type DatabaseVendedor } from "@/lib/supabase/database"
import Link from "next/link"
import { ArrowLeft, DollarSign, Package, Users, ShoppingCart } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatCard } from "@/components/stat-card"

// Helper function to map database status to StatusBadge status
function mapStatusToBadge(status: string): "aguardando" | "atrasado" | "devolvida" | "perda-total" {
  if (status === "Aguardando Devolução") return "aguardando"
  if (status === "Atrasado") return "atrasado"
  if (status === "Concluído") return "devolvida"
  if (status === "Perda Total") return "perda-total"
  return "aguardando"
}

export default function VendedorDetalhePage() {
  const params = useParams()
  const [vendedor, setVendedor] = useState<DatabaseVendedor | null>(null)
  const [clientesVendedor, setClientesVendedor] = useState<any[]>([])
  const [pedidosVendedor, setPedidosVendedor] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!params.id || typeof params.id !== "string") return

      try {
        setIsLoading(true)
        const [vendedorData, clientesData, pedidosData] = await Promise.all([
          getVendedorById(params.id),
          getClients(params.id),
          getOrders(params.id),
        ])

        setVendedor(vendedorData)
        setClientesVendedor(clientesData)
        setPedidosVendedor(pedidosData)
      } catch (error) {
        console.error("[v0] Error loading vendedor details:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [params.id])

  const pedidosPendentes = pedidosVendedor.filter(
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
      <ProtectedRoute allowedRoles={["Patrão", "Gerente", "Coordenador"]}>
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

  if (!vendedor) {
    return (
      <ProtectedRoute allowedRoles={["Patrão", "Gerente", "Coordenador"]}>
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
    <ProtectedRoute allowedRoles={["Patrão", "Gerente", "Coordenador"]}>
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
                  <h2 className="text-3xl font-bold tracking-tight">{vendedor.nome}</h2>
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
                            clientesVendedor.map((cliente) => {
                              // Calculate stats for each client
                              const clientePedidos = pedidosVendedor.filter((p) => p.cliente_id === cliente.id)
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
                                  <TableCell>{formatDate(cliente.updated_at || cliente.created_at)}</TableCell>
                                </TableRow>
                              )
                            })
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
                              const cliente = clientesVendedor.find((c) => c.id === pedido.cliente_id)
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
                              const cliente = clientesVendedor.find((c) => c.id === pedido.cliente_id)
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
                                  <TableCell>
                                    {pedido.tipo_venda === "Base de Troca" ? "Base de Troca" : "Normal"}
                                  </TableCell>
                                  <TableCell className="text-right">{formatCurrency(pedido.valor_total || 0)}</TableCell>
                                  <TableCell>{formatDate(pedido.data_venda)}</TableCell>
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
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
