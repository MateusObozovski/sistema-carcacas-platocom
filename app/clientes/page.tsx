"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { createNewClient, getVendedores } from "@/lib/supabase/database"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Search, Plus, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ClientesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [vendedorFiltro, setVendedorFiltro] = useState<string>("todos")
  const [clientes, setClientes] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    vendedor_id: user?.role === "Vendedor" ? user.id : "",
    ativo: true,
  })

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

        // Fetch vendedores para mostrar no filtro e no formulário
        if (user.role === "Patrão" || user.role === "Gerente" || user.role === "Coordenador") {
          const vendedoresData = await getVendedores()
          setVendedores(vendedoresData || [])
        } else if (user.role === "Vendedor") {
          // Vendedor só pode ver a si mesmo
          setVendedores([{ id: user.id, nome: user.nome || user.email }])
        }
      } catch (error) {
        console.error("[v0] Error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!formData.nome.trim()) {
        toast({
          title: "Erro",
          description: "O nome do cliente é obrigatório",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (!formData.vendedor_id) {
        toast({
          title: "Erro",
          description: "Selecione um vendedor",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      await createNewClient({
        nome: formData.nome.trim(),
        cnpj: formData.cnpj.trim() || undefined,
        telefone: formData.telefone.trim() || undefined,
        email: formData.email.trim() || undefined,
        endereco: formData.endereco.trim() || undefined,
        vendedor_id: formData.vendedor_id,
        ativo: formData.ativo,
      })

      toast({
        title: "Sucesso",
        description: "Cliente cadastrado com sucesso",
      })

      // Recarregar lista de clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from("clients")
        .select("*, profiles(nome)")
        .order("nome", { ascending: true })

      if (!clientesError) {
        setClientes(clientesData || [])
      }

      // Limpar formulário
      setFormData({
        nome: "",
        cnpj: "",
        telefone: "",
        email: "",
        endereco: "",
        vendedor_id: user?.role === "Vendedor" ? user.id : "",
        ativo: true,
      })
      setShowAddForm(false)
    } catch (error: any) {
      console.error("[v0] Error creating client:", error)
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível cadastrar o cliente",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
              <p className="text-muted-foreground">Visualize e gerencie todos os clientes</p>
            </div>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
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

          {showAddForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Cadastrar Novo Cliente</CardTitle>
                    <CardDescription>Preencha os dados do novo cliente</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome do Cliente *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        required
                        placeholder="Nome completo ou razão social"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={formData.cnpj}
                        onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="cliente@exemplo.com"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Input
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                        placeholder="Rua, número, bairro, cidade - UF"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vendedor_id">Vendedor *</Label>
                      <Select
                        value={formData.vendedor_id}
                        onValueChange={(value) => setFormData({ ...formData, vendedor_id: value })}
                        required
                        disabled={user?.role === "Vendedor"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendedores.map((vendedor) => (
                            <SelectItem key={vendedor.id} value={vendedor.id}>
                              {vendedor.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Cadastrando..." : "Cadastrar Cliente"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
