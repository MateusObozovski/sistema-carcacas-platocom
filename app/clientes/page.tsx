"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ClientesPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [vendedorFiltro, setVendedorFiltro] = useState<string>("todos")
  const [clientes, setClientes] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return

        const { data: clientesData, error: clientesError } = await supabase
          .from("clients")
          .select("*, profiles(nome)")
          .order("nome", { ascending: true })

        if (clientesError) {
          console.error("[v0] Error fetching clients:", clientesError)
          return
        }

        setClientes(clientesData || [])

        // Fetch vendedores para mostrar no filtro (apenas para admins)
        if (user.role === "Patrão" || user.role === "Gerente" || user.role === "Coordenador") {
          const { data: vendedoresData } = await supabase.from("profiles").select("id, nome").eq("role", "Vendedor")

          setVendedores(vendedoresData || [])
        }
      } catch (error) {
        console.error("[v0] Error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
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

  const clientesFiltrados = clientes
    .filter((cliente) => {
      const matchSearch =
        cliente.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.profiles?.nome?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchVendedor = vendedorFiltro === "todos" || cliente.vendedor_id === vendedorFiltro

      return matchSearch && matchVendedor
    })
    .sort((a, b) => (b.debito || 0) - (a.debito || 0))

  const debitoTotal = clientesFiltrados.reduce((acc, c) => acc + (c.debito || 0), 0)

  return (
    <ProtectedRoute allowedRoles={["Vendedor", "Coordenador", "Gerente", "Patrão"]}>
      <div className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
            <p className="text-muted-foreground">Visualize e gerencie todos os clientes</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clientesFiltrados.length}</div>
                <p className="text-xs text-muted-foreground">Clientes ativos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Débito Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(debitoTotal)}</div>
                <p className="text-xs text-muted-foreground">Soma de todos os débitos</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Busque e filtre clientes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome..."
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
              <CardTitle>Lista de Clientes</CardTitle>
              <CardDescription>{clientesFiltrados.length} clientes encontrados</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center text-muted-foreground">Carregando...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      {(user?.role === "Patrão" || user?.role === "Gerente" || user?.role === "Coordenador") && (
                        <TableHead>Vendedor</TableHead>
                      )}
                      <TableHead className="text-right">Débito</TableHead>
                      <TableHead>Última Atualização</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhum cliente encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      clientesFiltrados.map((cliente) => (
                        <TableRow key={cliente.id}>
                          <TableCell className="font-medium">{cliente.nome}</TableCell>
                          {(user?.role === "Patrão" || user?.role === "Gerente" || user?.role === "Coordenador") && (
                            <TableCell>{cliente.profiles?.nome || "-"}</TableCell>
                          )}
                          <TableCell className="text-right">
                            <span
                              className={
                                (cliente.debito || 0) > 8000
                                  ? "font-bold text-red-500"
                                  : (cliente.debito || 0) < 4000
                                    ? "font-bold text-green-500"
                                    : "font-bold"
                              }
                            >
                              {formatCurrency(cliente.debito || 0)}
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(cliente.updated_at)}</TableCell>
                          <TableCell className="text-right">
                            <Link href={`/clientes/${cliente.id}`} className="text-sm text-primary hover:underline">
                              Ver detalhes
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
