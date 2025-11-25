"use client"

import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { CardContent } from "@/components/ui/card"

import { CardDescription } from "@/components/ui/card"

import { CardTitle } from "@/components/ui/card"

import { CardHeader } from "@/components/ui/card"

import { Card } from "@/components/ui/card"

import { Button } from "@/components/ui/button"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { getOrderByNumber, updateOrderStatus, createClient } from "@/lib/supabase/database"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Search } from "lucide-react"
import Link from "next/link"
import { StatusBadge } from "@/components/status-badge"

// Helper function to map database status to StatusBadge status
function mapStatusToBadge(status: string): "aguardando" | "atrasado" | "devolvida" | "perda-total" {
  if (status === "Aguardando Devolução") return "aguardando"
  if (status === "Atrasado") return "atrasado"
  if (status === "Concluído") return "devolvida"
  if (status === "Perda Total") return "perda-total"
  return "aguardando"
}

export default function RegistrarDevolucaoPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createSupabaseClient()

  const [numeroPedido, setNumeroPedido] = useState("")
  const [pedidoEncontrado, setPedidoEncontrado] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleBuscarPedido = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)

    try {
      const pedido = await getOrderByNumber(numeroPedido)

      if (!pedido) {
        toast({
          title: "Pedido não encontrado",
          description: `Não foi encontrado nenhum pedido com o número ${numeroPedido}`,
          variant: "destructive",
        })
        setPedidoEncontrado(null)
        setIsSearching(false)
        return
      }

      if (user?.role === "Vendedor" && pedido.vendedor_id !== user.id) {
        toast({
          title: "Acesso negado",
          description: "Você só pode registrar devoluções dos seus próprios pedidos",
          variant: "destructive",
        })
        setPedidoEncontrado(null)
        setIsSearching(false)
        return
      }

      if (pedido.tipo_venda !== "Base de Troca") {
        toast({
          title: "Pedido inválido",
          description: "Este pedido não é do tipo Base de Troca e não possui carcaça para devolução",
          variant: "destructive",
        })
        setPedidoEncontrado(null)
        setIsSearching(false)
        return
      }

      if (pedido.status === "Concluído") {
        toast({
          title: "Carcaça já devolvida",
          description: "A carcaça deste pedido já foi devolvida anteriormente",
          variant: "destructive",
        })
        setPedidoEncontrado(null)
        setIsSearching(false)
        return
      }

      setPedidoEncontrado(pedido)
    } catch (error) {
      console.error("[v0] Error searching pedido:", error)
      toast({
        title: "Erro",
        description: "Não foi possível buscar o pedido",
        variant: "destructive",
      })
      setPedidoEncontrado(null)
    } finally {
      setIsSearching(false)
    }
  }

  const handleRegistrarDevolucao = async () => {
    if (!pedidoEncontrado) return

    setIsSubmitting(true)

    try {
      const dataDevolucao = new Date().toISOString()
      await updateOrderStatus(pedidoEncontrado.id, "Concluído", dataDevolucao)

      // Update order_items to zero debito_carcaca
      const { error: itemsError } = await supabase
        .from("order_items")
        .update({ debito_carcaca: 0 })
        .eq("order_id", pedidoEncontrado.id)
        .gt("debito_carcaca", 0)

      if (itemsError) {
        console.error("[v0] Error updating order items:", itemsError)
      }

      toast({
        title: "Devolução registrada com sucesso!",
        description: `O débito de ${formatCurrency(pedidoEncontrado.debito_carcaca || 0)} foi zerado automaticamente`,
      })

      setTimeout(() => {
        router.push(`/pedidos/${pedidoEncontrado.numero_pedido}`)
      }, 1000)
    } catch (error) {
      console.error("[v0] Error registering devolucao:", error)
      toast({
        title: "Erro",
        description: "Não foi possível registrar a devolução",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const [cliente, setCliente] = useState<any>(null)

  // Load cliente when pedido is found
  useEffect(() => {
    if (pedidoEncontrado) {
      const loadCliente = async () => {
        const { data } = await supabase
          .from("clients")
          .select("*")
          .eq("id", pedidoEncontrado.cliente_id)
          .single()
        setCliente(data)
      }
      loadCliente()
    }
  }, [pedidoEncontrado, supabase])

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/carcacas-pendentes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Registrar Devolução</h2>
            <p className="text-muted-foreground">Busque o pedido e registre a devolução da carcaça</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Buscar Pedido</CardTitle>
            <CardDescription>Digite o número do pedido para registrar a devolução</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBuscarPedido} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="numeroPedido">Número do Pedido</Label>
                <div className="flex gap-2">
                  <Input
                    id="numeroPedido"
                    placeholder="PED-2025-0001"
                    value={numeroPedido}
                    onChange={(e) => setNumeroPedido(e.target.value)}
                    required
                    disabled={isSearching}
                  />
                  <Button type="submit" disabled={isSearching}>
                    <Search className="mr-2 h-4 w-4" />
                    {isSearching ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {pedidoEncontrado && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Informações do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Número do Pedido</p>
                    <p className="font-mono font-medium">{pedidoEncontrado.numero_pedido}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{cliente?.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Produtos</p>
                    <div className="space-y-1">
                      {pedidoEncontrado.order_items?.map((item: any) => (
                        <p key={item.id} className="font-medium">
                          {item.produto_nome} x{item.quantidade}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data do Pedido</p>
                    <p className="font-medium">{formatDate(pedidoEncontrado.data_venda)}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                  <h3 className="font-semibold">Informações da Carcaça</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Débito de Carcaça</p>
                      <p className="text-lg font-bold text-yellow-500">
                        {formatCurrency(pedidoEncontrado.debito_carcaca || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status Atual</p>
                      <StatusBadge status={mapStatusToBadge(pedidoEncontrado.status)} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dias Pendente</p>
                      <p className="font-medium">{getDaysPending(pedidoEncontrado.data_venda)} dias</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleRegistrarDevolucao} className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? "Registrando..." : "Confirmar Devolução"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPedidoEncontrado(null)
                      setNumeroPedido("")
                    }}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}
