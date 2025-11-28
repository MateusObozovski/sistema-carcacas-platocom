"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { useAuth } from "@/lib/auth-context"
import { getOrderByNumber, updateOrderStatus, createClient as createSupabaseClient } from "@/lib/supabase/database"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, CheckCircle, Package } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Helper function to map database status to StatusBadge status
function mapStatusToBadge(status: string): "aguardando" | "atrasado" | "devolvida" | "perda-total" {
  if (status === "Aguardando Devolução") return "aguardando"
  if (status === "Atrasado") return "atrasado"
  if (status === "Concluído") return "devolvida"
  if (status === "Perda Total") return "perda-total"
  return "aguardando"
}

export default function PedidoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [pedido, setPedido] = useState<any>(null)
  const [cliente, setCliente] = useState<any>(null)
  const [vendedor, setVendedor] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      if (!params.numero || typeof params.numero !== "string") return

      try {
        setIsLoading(true)
        const pedidoData = await getOrderByNumber(params.numero)
        setPedido(pedidoData)

        // Get cliente
        const { data: clienteData } = await supabase
          .from("clients")
          .select("*")
          .eq("id", pedidoData.cliente_id)
          .single()

        setCliente(clienteData)

        // Get vendedor
        const { data: vendedorData } = await supabase
          .from("profiles")
          .select("id, nome")
          .eq("id", pedidoData.vendedor_id)
          .single()

        setVendedor(vendedorData)
      } catch (error) {
        console.error("[v0] Error loading pedido:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [params.numero, supabase])

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

  const handleRegistrarDevolucao = async () => {
    if (!pedido) return

    try {
      const dataDevolucao = new Date().toISOString()
      await updateOrderStatus(pedido.id, "Concluído", dataDevolucao)

      // Update order_items to zero debito_carcaca
      const { error: itemsError } = await supabase
        .from("order_items")
        .update({ debito_carcaca: 0 })
        .eq("order_id", pedido.id)
        .gt("debito_carcaca", 0)

      if (itemsError) {
        console.error("[v0] Error updating order items:", itemsError)
      }

      // Reload pedido
      const pedidoAtualizado = await getOrderByNumber(params.numero as string)
      setPedido(pedidoAtualizado)

      toast({
        title: "Devolução registrada!",
        description: "O débito de carcaça foi zerado automaticamente.",
      })
    } catch (error) {
      console.error("[v0] Error registering devolucao:", error)
      toast({
        title: "Erro",
        description: "Não foi possível registrar a devolução.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="text-center text-muted-foreground py-8">Carregando...</div>
      </ProtectedRoute>
    )
  }

  if (!pedido) {
    return (
      <ProtectedRoute>
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold">Pedido não encontrado</h2>
          <p className="text-muted-foreground">O pedido {params.numero} não existe no sistema.</p>
          <Button className="mt-4" asChild>
            <Link href="/pedidos">Voltar para Pedidos</Link>
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  const diasPendente = getDaysPending(pedido.data_venda)
  const primeiroItem = pedido.order_items?.[0]
  const tipoVendaBaseTroca = pedido.tipo_venda === "Base de Troca"

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-4xl space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/pedidos">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold tracking-tight">Pedido {pedido.numero_pedido}</h2>
                  <p className="text-muted-foreground">Detalhes completos do pedido</p>
                </div>
                {tipoVendaBaseTroca &&
                  (pedido.status === "Aguardando Devolução" || pedido.status === "Atrasado") && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Registrar Devolução
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar devolução de carcaça</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja registrar a devolução da carcaça do pedido {pedido.numero_pedido}? O
                            {pedido.debito_carcaca || 0} carcaça(s) será(ão) devolvida(s) automaticamente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRegistrarDevolucao}>Confirmar Devolução</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações do Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="font-medium">{cliente?.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vendedor</p>
                      <p className="font-medium">{vendedor?.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data do Pedido</p>
                      <p className="font-medium">{formatDate(pedido.data_venda)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Produto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Produtos</p>
                      <div className="space-y-1">
                        {pedido.order_items?.map((item: any) => (
                          <p key={item.id} className="font-medium">
                            {item.produto_nome} x{item.quantidade}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de Venda</p>
                      <p className="font-medium">{pedido.tipo_venda}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Valores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pedido.order_items?.map((item: any, index: number) => (
                      <div key={item.id} className={index > 0 ? "border-t border-border pt-3" : ""}>
                        <div className="mb-2">
                          <p className="text-sm font-medium">{item.produto_nome} x{item.quantidade}</p>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Preço Unitário</span>
                          <span className="font-medium">{formatCurrency(item.preco_unitario)}</span>
                        </div>
                        {item.desconto_percentual > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Desconto ({item.desconto_percentual}%)</span>
                            <span className="font-medium text-green-500">
                              - {formatCurrency((item.preco_unitario * item.desconto_percentual) / 100)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">{formatCurrency(item.preco_final * item.quantidade)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border pt-3">
                      <span className="font-semibold">Valor Total</span>
                      <span className="text-xl font-bold">{formatCurrency(pedido.valor_total || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {tipoVendaBaseTroca && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Carcaça
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Débito de Carcaça</span>
                        <span className="font-medium text-yellow-500">{pedido.debito_carcaca || 0} carcaça(s)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <StatusBadge status={mapStatusToBadge(pedido.status)} />
                      </div>
                      {(pedido.status === "Aguardando Devolução" || pedido.status === "Atrasado") && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dias Pendente</span>
                            <span className="font-medium">{diasPendente} dias</span>
                          </div>
                        </>
                      )}
                      {pedido.status === "Concluído" && pedido.data_devolucao && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Data de Devolução</span>
                          <span className="font-medium">{formatDate(pedido.data_devolucao)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {pedido.observacoes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{pedido.observacoes}</p>
                  </CardContent>
                </Card>
              )}
      </div>
    </ProtectedRoute>
  )
}
