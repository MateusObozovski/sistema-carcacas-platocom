"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardNav } from "@/components/dashboard-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { useAuth } from "@/lib/auth-context"
import { mockPedidos, mockClientes, mockVendedores } from "@/lib/mock-data"
import type { Pedido } from "@/lib/types"
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

export default function PedidoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [pedido, setPedido] = useState<Pedido | null>(null)

  useEffect(() => {
    const pedidosLocal = JSON.parse(localStorage.getItem("pedidos") || "[]")
    const todosPedidos = [...mockPedidos, ...pedidosLocal]
    const pedidoEncontrado = todosPedidos.find((p) => p.numero === params.numero)
    setPedido(pedidoEncontrado || null)
  }, [params.numero])

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

  const handleRegistrarDevolucao = () => {
    if (!pedido) return

    const pedidosLocal = JSON.parse(localStorage.getItem("pedidos") || "[]")
    const todosPedidos = [...mockPedidos, ...pedidosLocal]
    const index = todosPedidos.findIndex((p) => p.numero === pedido.numero)

    if (index !== -1) {
      todosPedidos[index] = {
        ...todosPedidos[index],
        statusCarcaca: "devolvida",
        dataDevolucao: new Date().toISOString().split("T")[0],
      }

      const pedidosParaSalvar = todosPedidos.filter((p) => !mockPedidos.find((mp) => mp.numero === p.numero))
      localStorage.setItem("pedidos", JSON.stringify(pedidosParaSalvar))

      setPedido(todosPedidos[index])

      toast({
        title: "Devolução registrada!",
        description: "O débito de carcaça foi zerado automaticamente.",
      })
    }
  }

  if (!pedido) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <div className="flex flex-1">
            <DashboardNav />
            <main className="flex-1 p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Pedido não encontrado</h2>
                <p className="text-muted-foreground">O pedido {params.numero} não existe no sistema.</p>
                <Button className="mt-4" asChild>
                  <Link href="/pedidos">Voltar para Pedidos</Link>
                </Button>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const cliente = mockClientes.find((c) => c.id === pedido.clienteId)
  const vendedor = mockVendedores.find((v) => v.id === pedido.vendedorId)
  const diasPendente = getDaysPending(pedido.dataCriacao)

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <DashboardNav />
          <main className="flex-1 p-6">
            <div className="mx-auto max-w-4xl space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/pedidos">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold tracking-tight">Pedido {pedido.numero}</h2>
                  <p className="text-muted-foreground">Detalhes completos do pedido</p>
                </div>
                {pedido.tipoVenda === "base-troca" &&
                  (pedido.statusCarcaca === "aguardando" || pedido.statusCarcaca === "atrasado") && (
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
                            Tem certeza que deseja registrar a devolução da carcaça do pedido {pedido.numero}? O débito
                            de {formatCurrency(pedido.debitoCarcaca)} será zerado automaticamente.
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
                      <p className="font-medium">{cliente?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vendedor</p>
                      <p className="font-medium">{vendedor?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data do Pedido</p>
                      <p className="font-medium">{formatDate(pedido.dataCriacao)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Produto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Produto</p>
                      <p className="font-medium">{pedido.produto}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de Venda</p>
                      <p className="font-medium">
                        {pedido.tipoVenda === "base-troca" ? "Base de Troca" : "Venda Normal"}
                      </p>
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Preço Original</span>
                      <span className="font-medium">{formatCurrency(pedido.precoOriginal)}</span>
                    </div>
                    {pedido.tipoVenda === "base-troca" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Desconto ({pedido.desconto}%)</span>
                          <span className="font-medium text-green-500">
                            - {formatCurrency((pedido.precoOriginal * pedido.desconto) / 100)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-3">
                          <span className="font-semibold">Preço Final</span>
                          <span className="text-xl font-bold">{formatCurrency(pedido.precoFinal)}</span>
                        </div>
                      </>
                    )}
                    {pedido.tipoVenda === "normal" && (
                      <div className="flex justify-between border-t border-border pt-3">
                        <span className="font-semibold">Preço Final</span>
                        <span className="text-xl font-bold">{formatCurrency(pedido.precoFinal)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {pedido.tipoVenda === "base-troca" && (
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
                        <span className="font-medium text-yellow-500">{formatCurrency(pedido.debitoCarcaca)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <StatusBadge status={pedido.statusCarcaca} />
                      </div>
                      {(pedido.statusCarcaca === "aguardando" || pedido.statusCarcaca === "atrasado") && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dias Pendente</span>
                            <span className="font-medium">{diasPendente} dias</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Previsão de Devolução</span>
                            <span className="font-medium">{formatDate(pedido.dataPrevisaoDevolucao)}</span>
                          </div>
                        </>
                      )}
                      {pedido.statusCarcaca === "devolvida" && pedido.dataDevolucao && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Data de Devolução</span>
                          <span className="font-medium">{formatDate(pedido.dataDevolucao)}</span>
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
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
