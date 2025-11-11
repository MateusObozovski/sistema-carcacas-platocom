"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function PedidosPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "normal" | "base-troca">("todos")
  const [statusFiltro, setStatusFiltro] = useState<"todos" | string>("todos")
  const [pedidos, setPedidos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        if (!user) return

        const { data, error } = await supabase
          .from("orders")
          .select("*, clients(nome), profiles(nome)")
          .order("data_venda", { ascending: false })

        if (error) {
          console.error("[v0] Error fetching orders:", error)
          return
        }

        setPedidos(data || [])
      } catch (error) {
        console.error("[v0] Error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPedidos()
  }, [user, supabase])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const matchSearch =
      pedido.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.clients?.nome?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchTipo = tipoFiltro === "todos" || pedido.tipo_venda === tipoFiltro
    const matchStatus = statusFiltro === "todos" || pedido.status === statusFiltro

    return matchSearch && matchTipo && matchStatus
  })

  return (
    <ProtectedRoute allowedRoles={["Vendedor", "Coordenador", "Gerente", "Patrão"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Pedidos</h2>
            <p className="text-muted-foreground">Visualize e gerencie todos os pedidos</p>
          </div>
          <Button asChild>
            <Link href="/nova-venda">Nova Venda</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Busque e filtre pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de venda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="normal">Venda Normal</SelectItem>
                  <SelectItem value="base-troca">Base de Troca</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                  <SelectItem value="devolvida">Devolvida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Pedidos</CardTitle>
            <CardDescription>{pedidosFiltrados.length} pedidos encontrados</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-muted-foreground">Carregando...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    {(user?.role === "Patrão" || user?.role === "Gerente" || user?.role === "Coordenador") && (
                      <TableHead>Vendedor</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Nenhum pedido encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    pedidosFiltrados.map((pedido) => (
                      <TableRow key={pedido.id}>
                        <TableCell className="font-mono text-sm">
                          <Link href={`/pedidos/${pedido.numero_pedido}`} className="hover:underline">
                            {pedido.numero_pedido}
                          </Link>
                        </TableCell>
                        <TableCell>{pedido.clients?.nome || "-"}</TableCell>
                        <TableCell>{pedido.tipo_venda === "base-troca" ? "Base de Troca" : "Normal"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(pedido.valor_total || 0)}</TableCell>
                        <TableCell className="text-right">
                          {pedido.debito_carcaca > 0 ? formatCurrency(pedido.debito_carcaca) : "-"}
                        </TableCell>
                        <TableCell>{formatDate(pedido.data_venda)}</TableCell>
                        <TableCell>
                          <StatusBadge status={pedido.status} />
                        </TableCell>
                        {(user?.role === "Patrão" || user?.role === "Gerente" || user?.role === "Coordenador") && (
                          <TableCell>{pedido.profiles?.nome || "-"}</TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
