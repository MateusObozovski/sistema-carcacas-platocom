"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { updateOrderStatus } from "@/lib/supabase/database"
import Link from "next/link"
import { Search, CheckCircle, AlertTriangle, Bell } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@supabase/ssr"

export default function CarcacasPendentesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "aguardando" | "atrasado">("todos")
  const [vendedorFiltro, setVendedorFiltro] = useState<string>("todos")
  const [clienteFiltro, setClienteFiltro] = useState<string>("todos")
  const [carcacasPendentes, setCarcacasPendentes] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    const fetchCarcacas = async () => {
      try {
        setLoading(true)
        if (!user?.id) {
          setLoading(false)
          return
        }

        const { data: orderItems, error } = await supabase
          .from("order_items")
          .select(
            `
            id,
            ordem:order_id,
            orders!inner(
              id,
              numero_pedido,
              vendedor_id,
              cliente_id,
              data_venda,
              data_devolucao,
              created_at,
              clients!inner(
                id,
                nome,
                vendedor_id
              ),
              profiles(id, nome, email)
            ),
            produto_nome,
            debito_carcaca,
            tipo_venda,
            created_at
          `,
          )
          .gt("debito_carcaca", 0)
          .eq("tipo_venda", "Base de Troca")
          .order("created_at", { ascending: false })

        if (error) {
          console.error("[v0] Error fetching carcacas:", error)
          setLoading(false)
          return
        }

        let filtered = orderItems || []
        if (user?.role === "Vendedor") {
          filtered = filtered.filter((item: any) => item.orders?.vendedor_id === user.id)
        }

        setCarcacasPendentes(filtered)

        // Carregar vendedores (para admins)
        if (user?.role === "admin" || user?.role === "Gerente" || user?.role === "Coordenador") {
          const { data: vendedoresData } = await supabase
            .from("profiles")
            .select("id, nome")
            .eq("role", "Vendedor")
            .eq("ativo", true)
            .order("nome")

          setVendedores(vendedoresData || [])
        }

        // Carregar clientes únicos das carcaças pendentes
        const clientesUnicos = new Map()
        filtered.forEach((item: any) => {
          if (item.orders?.clients) {
            const cliente = item.orders.clients
            if (!clientesUnicos.has(cliente.id)) {
              clientesUnicos.set(cliente.id, {
                id: cliente.id,
                nome: cliente.nome,
              })
            }
          }
        })
        setClientes(Array.from(clientesUnicos.values()).sort((a, b) => a.nome.localeCompare(b.nome)))
      } catch (err) {
        console.error("[v0] Error in fetchCarcacas:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchCarcacas()
  }, [user?.id, user?.role, supabase])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const getDaysPending = (dataCriacao: string) => {
    const created = new Date(dataCriacao)
    const now = new Date()
    const diff = now.getTime() - created.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  const handleRegistrarDevolucao = async (itemId: string, debitoValue: number, orderId: string) => {
    try {
      // Atualizar o order_item zerando o débito
      const { error: itemError } = await supabase
        .from("order_items")
        .update({
          debito_carcaca: 0,
        })
        .eq("id", itemId)

      if (itemError) {
        console.error("[v0] Error updating order item:", itemError)
        toast({
          title: "Erro ao registrar devolução",
          description: itemError.message || "Não foi possível atualizar o item do pedido",
          variant: "destructive",
        })
        return
      }

      // Verificar se todas as carcaças do pedido foram devolvidas
      const { data: remainingItems, error: checkError } = await supabase
        .from("order_items")
        .select("id, debito_carcaca")
        .eq("order_id", orderId)
        .gt("debito_carcaca", 0)

      if (checkError) {
        console.error("[v0] Error checking remaining items:", checkError)
      }

      // Se não há mais carcaças pendentes neste pedido, atualizar status do pedido
      if (!remainingItems || remainingItems.length === 0) {
        const dataDevolucao = new Date().toISOString()
        try {
          await updateOrderStatus(orderId, "Concluído", dataDevolucao)
        } catch (orderError: any) {
          console.error("[v0] Error updating order status:", orderError)
          // Não falhar se não conseguir atualizar o status, apenas logar
        }
      }

      // Recarregar a lista de carcaças pendentes
      const fetchCarcacas = async () => {
        try {
          const { data: orderItems, error } = await supabase
            .from("order_items")
            .select(
              `
            id,
            ordem:order_id,
            orders!inner(
              id,
              numero_pedido,
              vendedor_id,
              cliente_id,
              data_venda,
              data_devolucao,
              created_at,
              clients!inner(
                id,
                nome,
                vendedor_id
              ),
              profiles(id, nome, email)
            ),
            produto_nome,
            debito_carcaca,
            tipo_venda,
            created_at
          `,
            )
            .gt("debito_carcaca", 0)
            .eq("tipo_venda", "Base de Troca")
            .order("created_at", { ascending: false })

          if (error) {
            console.error("[v0] Error fetching carcacas:", error)
            return
          }

          let filtered = orderItems || []
          if (user?.role === "Vendedor") {
            filtered = filtered.filter((item: any) => item.orders?.vendedor_id === user.id)
          }

          setCarcacasPendentes(filtered)
        } catch (err) {
          console.error("[v0] Error reloading carcacas:", err)
        }
      }

      await fetchCarcacas()

      toast({
        title: "Devolução registrada!",
        description: `Débito de ${formatCurrency(debitoValue)} zerado`,
      })
    } catch (err: any) {
      console.error("[v0] Error registering devolucao:", err)
      toast({
        title: "Erro ao registrar devolução",
        description: err?.message || "Não foi possível registrar a devolução",
        variant: "destructive",
      })
    }
  }

  const handleLembrarCliente = (cliente: string) => {
    toast({
      title: "Lembrete enviado!",
      description: `Notificação enviada para ${cliente}`,
    })
  }

  const filtered = carcacasPendentes
    .filter((item) => {
      const matchSearch =
        item.orders?.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.orders?.clients?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.orders?.profiles?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.produto_nome?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchVendedor = vendedorFiltro === "todos" || item.orders?.vendedor_id === vendedorFiltro
      const matchCliente = clienteFiltro === "todos" || item.orders?.cliente_id === clienteFiltro

      const matchStatus =
        statusFiltro === "todos" ||
        (statusFiltro === "atrasado" && getDaysPending(item.created_at) > 30) ||
        (statusFiltro === "aguardando" && getDaysPending(item.created_at) <= 30)

      return matchSearch && matchVendedor && matchCliente && matchStatus
    })
    .sort((a, b) => {
      const diasA = getDaysPending(a.created_at)
      const diasB = getDaysPending(b.created_at)
      return diasB - diasA
    })

  const totalDebito = filtered.reduce((acc, item) => acc + (item.debito_carcaca || 0), 0)
  const totalAtrasados = filtered.filter((item) => {
    const dias = getDaysPending(item.created_at)
    return dias > 30
  }).length

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Carcaças Pendentes</h2>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Carcaças Pendentes</h2>
          <p className="text-muted-foreground">Controle de carcaças aguardando devolução</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Carcaças</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filtered.length}</div>
              <p className="text-xs text-muted-foreground">Aguardando devolução</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Débito Total</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalDebito)}</div>
              <p className="text-xs text-muted-foreground">Valor pendente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{totalAtrasados}</div>
              <p className="text-xs text-muted-foreground">Mais de 30 dias</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Busque e filtre carcaças pendentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, cliente, produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {(user?.role === "admin" || user?.role === "Gerente" || user?.role === "Coordenador") && (
                <Select value={vendedorFiltro} onValueChange={setVendedorFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os vendedores</SelectItem>
                    {vendedores.map((vendedor) => (
                      <SelectItem key={vendedor.id} value={vendedor.id}>
                        {vendedor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="aguardando">Aguardando (≤30 dias)</SelectItem>
                  <SelectItem value="atrasado">Atrasado (&gt;30 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Carcaças Pendentes</CardTitle>
            <CardDescription>{filtered.length} carcaças aguardando devolução</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  {(user?.role === "admin" || user?.role === "Gerente" || user?.role === "Coordenador") && (
                    <TableHead>Vendedor</TableHead>
                  )}
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Débito</TableHead>
                  <TableHead className="text-center">Dias</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        user?.role === "admin" || user?.role === "Gerente" || user?.role === "Coordenador" ? 7 : 6
                      }
                      className="text-center text-muted-foreground"
                    >
                      Nenhuma carcaça pendente encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const diasPendente = getDaysPending(item.created_at)

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">
                          <Link href={`/pedidos/${item.orders?.numero_pedido}`} className="hover:underline">
                            {item.orders?.numero_pedido}
                          </Link>
                        </TableCell>
                        <TableCell>{item.orders?.clients?.nome}</TableCell>
                        {(user?.role === "admin" || user?.role === "Gerente" || user?.role === "Coordenador") && (
                          <TableCell>{item.orders?.profiles?.nome}</TableCell>
                        )}
                        <TableCell>{item.produto_nome}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.debito_carcaca)}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={diasPendente > 30 ? "destructive" : diasPendente > 20 ? "default" : "secondary"}
                          >
                            {diasPendente} dias
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLembrarCliente(item.orders?.clients?.nome)}
                              title="Lembrar cliente"
                            >
                              <Bell className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" title="Registrar devolução">
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar devolução de carcaça</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja registrar a devolução da carcaça do pedido{" "}
                                    {item.orders?.numero_pedido}? O débito de {formatCurrency(item.debito_carcaca)} será
                                    zerado automaticamente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleRegistrarDevolucao(item.id, item.debito_carcaca, item.orders?.id)
                                    }
                                  >
                                    Confirmar Devolução
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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
