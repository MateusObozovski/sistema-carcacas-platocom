"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
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
  const [carcacasPendentes, setCarcacasPendentes] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    const fetchCarcacas = async () => {
      try {
        if (!user?.id) return

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
          .eq("tipo_venda", "base-troca")
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

        if (user?.role === "Patrão" || user?.role === "Gerente" || user?.role === "Coordenador") {
          const { data: vendedoresData } = await supabase
            .from("profiles")
            .select("id, nome")
            .eq("role", "Vendedor")
            .eq("ativo", true)
            .order("nome")

          setVendedores(vendedoresData || [])
        }
      } catch (err) {
        console.error("[v0] Error in fetchCarcacas:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchCarcacas()
  }, [user?.id, user?.role])

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

  const handleRegistrarDevolucao = async (itemId: string, debitoValue: number) => {
    try {
      const { error } = await supabase
        .from("order_items")
        .update({
          debito_carcaca: 0,
        })
        .eq("id", itemId)

      if (error) {
        toast({
          title: "Erro ao registrar devolução",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      setCarcacasPendentes((prev) => prev.filter((item) => item.id !== itemId))

      toast({
        title: "Devolução registrada!",
        description: `Débito de ${formatCurrency(debitoValue)} zerado`,
      })
    } catch (err) {
      console.error("[v0] Error registering devolucao:", err)
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
        item.orders?.profiles?.nome?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchVendedor = vendedorFiltro === "todos" || item.orders?.vendedor_id === vendedorFiltro

      return matchSearch && matchVendedor
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
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {(user?.role === "Patrão" || user?.role === "Gerente" || user?.role === "Coordenador") && (
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
                  {(user?.role === "Patrão" || user?.role === "Gerente" || user?.role === "Coordenador") && (
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
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                        {(user?.role === "Patrão" || user?.role === "Gerente" || user?.role === "Coordenador") && (
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
                                    onClick={() => handleRegistrarDevolucao(item.id, item.debito_carcaca)}
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
