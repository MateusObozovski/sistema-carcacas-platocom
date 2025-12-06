"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import { getClientById, getOrders, createClient } from "@/lib/supabase/database"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import Link from "next/link"
import { ArrowLeft, DollarSign, Package, ShoppingCart } from "lucide-react"
import { StatCard } from "@/components/stat-card"

// Helper function to map database status to StatusBadge status
function mapStatusToBadge(status: string): "aguardando" | "atrasado" | "devolvida" | "perda-total" {
  if (status === "Aguardando Devolução") return "aguardando"
  if (status === "Atrasado") return "atrasado"
  if (status === "Concluído") return "devolvida"
  if (status === "Perda Total") return "perda-total"
  return "aguardando"
}

export default function ClienteDetalhePage() {
  const params = useParams()
  const [cliente, setCliente] = useState<any>(null)
  const [vendedor, setVendedor] = useState<any>(null)
  const [pedidosCliente, setPedidosCliente] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createSupabaseClient()

  useEffect(() => {
    const loadData = async () => {
      if (!params.id || typeof params.id !== "string") return

      try {
        setIsLoading(true)
        const clienteData = await getClientById(params.id)
        if (!clienteData) return

        setCliente(clienteData)

        // Get vendedor
        const { data: vendedorData } = await supabase
          .from("profiles")
          .select("id, nome")
          .eq("id", clienteData.vendedor_id)
          .single()

        setVendedor(vendedorData)

        // Get orders for this client
        const { data: ordersData } = await supabase
          .from("orders")
          .select("*, order_items (*)")
          .eq("cliente_id", params.id)
          .order("data_venda", { ascending: false })

        setPedidosCliente(ordersData || [])
      } catch (error) {
        console.error("[v0] Error loading cliente details:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [params.id, supabase])

  const pedidosPendentes = pedidosCliente.filter(
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
      <ProtectedRoute>
        <div className="text-center text-muted-foreground">Carregando...</div>
      </ProtectedRoute>
    )
  }

  if (!cliente) {
    return (
      <ProtectedRoute>
        <div className="text-center">
          <h2 className="text-2xl font-bold">Cliente não encontrado</h2>
          <Button className="mt-4" asChild>
            <Link href="/clientes">Voltar para Clientes</Link>
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clientes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{cliente.nome}</h2>
            <p className="text-muted-foreground">Vendedor: {vendedor?.nome}</p>
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
                        pedidosPendentes.map((pedido) => {
                          const primeiroItem = pedido.order_items?.[0]
                          return (
                            <TableRow key={pedido.id}>
                              <TableCell className="font-mono text-sm">
                                <Link href={`/pedidos/${pedido.numero_pedido}`} className="hover:underline">
                                  {pedido.numero_pedido}
                                </Link>
                              </TableCell>
                              <TableCell>{primeiroItem?.produto_nome || "-"}</TableCell>
                              <TableCell className="text-right">{formatCurrency(pedido.debito_carcaca || 0)}</TableCell>
                              <TableCell className="text-center">{getDaysPending(pedido.data_venda)} dias</TableCell>
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
                        pedidosCliente.map((pedido) => {
                          const primeiroItem = pedido.order_items?.[0]
                          return (
                            <TableRow key={pedido.id}>
                              <TableCell className="font-mono text-sm">
                                <Link href={`/pedidos/${pedido.numero_pedido}`} className="hover:underline">
                                  {pedido.numero_pedido}
                                </Link>
                              </TableCell>
                              <TableCell>{primeiroItem?.produto_nome || "-"}</TableCell>
                              <TableCell>{pedido.tipo_venda === "Base de Troca" ? "Base de Troca" : "Normal"}</TableCell>
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
      </div>
    </ProtectedRoute>
  )
}
