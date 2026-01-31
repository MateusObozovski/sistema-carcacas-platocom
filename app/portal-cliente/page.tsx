"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatCard } from "@/components/stat-card"
import {
  Package2,
  Clock,
  CheckCircle2,
  FileDown,
  DollarSign,
  AlertTriangle,
  ShoppingCart,
  LogOut,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { generateOrderPDF } from "@/lib/pdf-generator"
import Image from "next/image"

interface Order {
  id: string
  numero_pedido: string
  data_venda: string
  status: string
  valor_total: number
  tipo_venda: string
  observacoes?: string
  order_items: OrderItem[]
}

interface OrderItem {
  id: string
  produto_nome: string
  quantidade: number
  preco_unitario: number
  preco_final: number
  debito_carcaca: number
  tipo_venda: string
}

interface ClientData {
  id: string
  nome: string
  cnpj?: string
  email?: string
}

export default function PortalClientePage() {
  const { user, logout, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== "Cliente") {
        router.push("/dashboard")
        return
      }
      loadData()
    } else if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const loadData = async () => {
    try {
      // Get client ID for this user
      const { data: clientUser } = await supabase
        .from("client_users")
        .select("client_id")
        .eq("user_id", user?.id)
        .single()

      if (!clientUser) {
        setLoading(false)
        return
      }

      // Get client data
      const { data: client } = await supabase
        .from("clients")
        .select("id, nome, cnpj, email")
        .eq("id", clientUser.client_id)
        .single()

      if (client) {
        setClientData(client)
      }

      // Get orders for this client
      const { data: ordersData } = await supabase
        .from("orders")
        .select(
          `
          id,
          numero_pedido,
          data_venda,
          status,
          valor_total,
          tipo_venda,
          observacoes,
          order_items (
            id,
            produto_nome,
            quantidade,
            preco_unitario,
            preco_final,
            debito_carcaca,
            tipo_venda
          )
        `
        )
        .eq("cliente_id", clientUser.client_id)
        .order("data_venda", { ascending: false })

      setOrders(ordersData || [])
    } catch (error) {
      console.error("[v0] Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const handleDownloadPDF = async (order: Order) => {
    setGeneratingPdf(order.id)
    setMessage(null)

    try {
      await generateOrderPDF({
        ...order,
        cliente_nome: clientData?.nome,
      })
      setMessage({ type: "success", text: "PDF gerado com sucesso!" })
    } catch (error) {
      console.error("[v0] Error generating PDF:", error)
      setMessage({ type: "error", text: "Erro ao gerar PDF. Tente novamente." })
    } finally {
      setGeneratingPdf(null)
    }
  }

  // Calcular estatísticas
  const stats = useMemo(() => {
    const totalPedidos = orders.length
    const carcacasPendentes = orders.reduce(
      (sum, order) =>
        sum + order.order_items.reduce((itemSum, item) => itemSum + item.debito_carcaca, 0),
      0
    )
    const pedidosPendentes = orders.filter(
      (o) => o.status === "Aguardando Devolução" || o.status === "Atrasado"
    ).length
    const pedidosAtrasados = orders.filter((o) => o.status === "Atrasado").length

    return {
      totalPedidos,
      carcacasPendentes,
      pedidosPendentes,
      pedidosAtrasados,
    }
  }, [orders])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Aguardando Devolução":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="mr-1 h-3 w-3" />
            Aguardando
          </Badge>
        )
      case "Atrasado":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Atrasado
          </Badge>
        )
      case "Concluído":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Concluído
          </Badge>
        )
      case "Perda Total":
        return (
          <Badge variant="destructive">
            Perda Total
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== "Cliente") {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/logo-sem-fundo.png"
                alt="Platocom"
                width={120}
                height={40}
                className="object-contain"
              />
              <div className="hidden md:block border-l pl-4">
                <h1 className="text-lg font-semibold">Portal do Cliente</h1>
                <p className="text-sm text-muted-foreground">{clientData?.nome}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden md:block">
                {user?.name}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Welcome Message on Mobile */}
        <div className="md:hidden">
          <h1 className="text-xl font-semibold">Portal do Cliente</h1>
          <p className="text-sm text-muted-foreground">{clientData?.nome}</p>
        </div>

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total de Pedidos"
            value={stats.totalPedidos}
            icon={ShoppingCart}
            description="Pedidos realizados"
          />
          <StatCard
            title="Carcaças Pendentes"
            value={stats.carcacasPendentes}
            icon={Package2}
            description="Aguardando devolução"
          />
          <StatCard
            title="Pedidos Pendentes"
            value={stats.pedidosPendentes}
            icon={Clock}
            description="Com carcaças a devolver"
          />
          <StatCard
            title="Pedidos Atrasados"
            value={stats.pedidosAtrasados}
            icon={AlertTriangle}
            description="Prazo excedido"
            className={stats.pedidosAtrasados > 0 ? "border-red-500/50" : ""}
          />
        </div>

        {/* Carcaças Pendentes */}
        {stats.carcacasPendentes > 0 && (
          <Card className="border-yellow-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package2 className="h-5 w-5 text-yellow-600" />
                Carcaças Pendentes
              </CardTitle>
              <CardDescription>
                Itens com carcaças aguardando devolução
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtd. Pendente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders
                      .filter(
                        (o) =>
                          o.status === "Aguardando Devolução" || o.status === "Atrasado"
                      )
                      .flatMap((order) =>
                        order.order_items
                          .filter((item) => item.debito_carcaca > 0)
                          .map((item) => (
                            <TableRow key={`${order.id}-${item.id}`}>
                              <TableCell className="font-mono text-sm">
                                {order.numero_pedido}
                              </TableCell>
                              <TableCell>{item.produto_nome}</TableCell>
                              <TableCell className="text-center font-semibold">
                                {item.debito_carcaca}
                              </TableCell>
                              <TableCell>{formatDate(order.data_venda)}</TableCell>
                              <TableCell>{getStatusBadge(order.status)}</TableCell>
                            </TableRow>
                          ))
                      )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Pedidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Meus Pedidos
            </CardTitle>
            <CardDescription>
              Histórico de todos os seus pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="py-12 text-center">
                <Package2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum pedido encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Carcaças</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const carcacasPendentes = order.order_items.reduce(
                        (sum, item) => sum + item.debito_carcaca,
                        0
                      )
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm font-medium">
                            {order.numero_pedido}
                          </TableCell>
                          <TableCell>{formatDate(order.data_venda)}</TableCell>
                          <TableCell>
                            {order.tipo_venda === "Base de Troca" ? (
                              <Badge variant="secondary">Base de Troca</Badge>
                            ) : (
                              <Badge variant="outline">Normal</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(order.valor_total)}
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-center">
                            {carcacasPendentes > 0 ? (
                              <span className="text-yellow-600 font-medium">
                                {carcacasPendentes} pendente(s)
                              </span>
                            ) : (
                              <span className="text-green-600">OK</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPDF(order)}
                              disabled={generatingPdf === order.id}
                            >
                              <FileDown className="h-4 w-4 mr-1" />
                              {generatingPdf === order.id ? "Gerando..." : "PDF"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Platocom - Sistema de Carcaças
        </div>
      </footer>
    </div>
  )
}
