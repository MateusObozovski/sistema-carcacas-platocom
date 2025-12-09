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
import { useToast } from "@/hooks/use-toast"
import { Search, Plus, Trash2, Package, CheckCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  createMerchandiseEntry,
  getMerchandiseEntries,
  getMerchandiseEntriesWithLinks,
  getClients,
  getProducts,
  type DatabaseMerchandiseEntry,
  type DatabaseProduct,
  type DatabaseClient,
} from "@/lib/supabase/database"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isAuthError } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { PRODUCT_MARCAS } from "@/lib/types"

interface EntryItem {
  produtoId: string
  produtoNome: string
  quantidade: number
}

export default function EntradaMercadoriaPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "Pendente" | "Concluída">("todos")
  const [entradas, setEntradas] = useState<DatabaseMerchandiseEntry[]>([])
  const [entradasComLinks, setEntradasComLinks] = useState<any[]>([])
  const [clientes, setClientes] = useState<DatabaseClient[]>([])
  const [produtos, setProdutos] = useState<DatabaseProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingRelatorios, setIsLoadingRelatorios] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [relatorioClienteFiltro, setRelatorioClienteFiltro] = useState<string>("todos")
  const [relatorioStatusFiltro, setRelatorioStatusFiltro] = useState<"todos" | "Pendente" | "Concluída">("todos")
  
  // Filtros para seleção de produtos
  const [produtoFiltroMarca, setProdutoFiltroMarca] = useState<string>("all")
  const [produtoFiltroTipo, setProdutoFiltroTipo] = useState<string>("all")
  const [produtoFiltroCategoria, setProdutoFiltroCategoria] = useState<string>("all")
  const [produtoBusca, setProdutoBusca] = useState<string>("")

  const [formData, setFormData] = useState({
    cliente_id: "",
    numero_nota_fiscal: "",
    data_nota: new Date().toISOString().split("T")[0],
    items: [] as EntryItem[],
  })

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      // Timeout de segurança (30 segundos)
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.error("[v0] Timeout ao carregar entrada de mercadoria")
          setIsLoading(false)
          toast({
            title: "Erro",
            description: "O carregamento está demorando muito. Tente recarregar a página.",
            variant: "destructive",
          })
        }
      }, 30000)

      try {
        if (!user) {
          setIsLoading(false)
          clearTimeout(timeoutId)
          return
        }

        setIsLoading(true)

        // Buscar entradas
        const entradasData = await getMerchandiseEntries(user.id, user.role)
        setEntradas(entradasData || [])

        // Buscar clientes
        const clientesData = await getClients()
        setClientes(clientesData || [])

        // Buscar produtos
        const produtosData = await getProducts()
        setProdutos(produtosData || [])
      } catch (error: any) {
        console.error("[v0] Error fetching data:", error)
        
        // Verificar se é erro de autenticação
        if (isAuthError(error)) {
          toast({
            title: "Sessão expirada",
            description: "Sua sessão expirou. Por favor, faça login novamente.",
            variant: "destructive",
          })
          setTimeout(() => {
            router.push("/login")
          }, 2000)
        } else {
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados. Tente novamente.",
            variant: "destructive",
          })
        }
        
        setEntradas([])
        setClientes([])
        setProdutos([])
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
        clearTimeout(timeoutId)
      }
    }

    fetchData()
    
    return () => {
      isMounted = false
    }
  }, [user, toast, router])

  const loadRelatorios = async () => {
    try {
      setIsLoadingRelatorios(true)
      if (!user) return

      const data = await getMerchandiseEntriesWithLinks(user.id, user.role)
      setEntradasComLinks(data || [])
    } catch (error) {
      console.error("[v0] Error loading relatorios:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os relatórios",
        variant: "destructive",
      })
    } finally {
      setIsLoadingRelatorios(false)
    }
  }

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          produtoId: "",
          produtoNome: "",
          quantidade: 1,
        },
      ],
    })
  }

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  // Função para obter produtos filtrados, excluindo os já adicionados (exceto o item atual)
  const getProdutosFiltrados = (excludeProdutoId?: string) => {
    const produtosJaAdicionados = formData.items
      .map((item) => item.produtoId)
      .filter((id) => id !== "" && id !== excludeProdutoId) // Excluir todos exceto o item atual

    return produtos.filter((p) => {
      if (!p.ativo) return false
      
      // Excluir produtos já adicionados (exceto o item atual sendo editado)
      if (produtosJaAdicionados.includes(p.id)) return false
      
      // Filtro por marca
      if (produtoFiltroMarca !== "all" && p.marca !== produtoFiltroMarca) return false
      
      // Filtro por tipo
      if (produtoFiltroTipo !== "all" && p.tipo !== produtoFiltroTipo) return false
      
      // Filtro por categoria
      if (produtoFiltroCategoria !== "all" && p.categoria !== produtoFiltroCategoria) return false
      
      // Busca por nome, código de fábrica ou código Sachs
      if (produtoBusca.trim() !== "") {
        const buscaLower = produtoBusca.toLowerCase()
        const matchNome = p.nome.toLowerCase().includes(buscaLower)
        const matchCodigoFabrica = p.codigo_fabrica?.toLowerCase().includes(buscaLower) || false
        const matchCodigoSachs = p.codigo_sachs?.toLowerCase().includes(buscaLower) || false
        
        if (!matchNome && !matchCodigoFabrica && !matchCodigoSachs) return false
      }
      
      return true
    })
  }

  // Obter valores únicos para os filtros
  // Usar lista fixa de marcas
  const marcasUnicas = PRODUCT_MARCAS
  const tiposUnicos = Array.from(new Set(produtos.filter((p) => p.ativo).map((p) => p.tipo))).sort()
  const categoriasUnicas = Array.from(new Set(produtos.filter((p) => p.ativo).map((p) => p.categoria))).sort()

  const handleItemChange = (index: number, field: keyof EntryItem, value: string | number) => {
    const newItems = [...formData.items]
    if (field === "produtoId") {
      // Verificar se o produto já está em outra linha
      const produtoJaExiste = newItems.some(
        (item, i) => i !== index && item.produtoId === value && value !== ""
      )
      
      if (produtoJaExiste) {
        toast({
          title: "Erro",
          description: "Este produto já foi adicionado. Cada item só pode aparecer uma vez.",
          variant: "destructive",
        })
        return
      }

      const produto = produtos.find((p) => p.id === value)
      newItems[index] = {
        ...newItems[index],
        produtoId: value as string,
        produtoNome: produto?.nome || "",
      }
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]: value,
      }
    }
    setFormData({ ...formData, items: newItems })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!formData.cliente_id) {
        toast({
          title: "Erro",
          description: "Selecione um cliente",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (!formData.numero_nota_fiscal.trim()) {
        toast({
          title: "Erro",
          description: "Informe o número da nota fiscal",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (formData.items.length === 0) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos um item",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Validar itens
      const produtosIds = new Set<string>()
      for (const item of formData.items) {
        if (!item.produtoId) {
          toast({
            title: "Erro",
            description: "Todos os itens devem ter um produto selecionado",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
        if (item.quantidade <= 0) {
          toast({
            title: "Erro",
            description: "A quantidade deve ser maior que zero",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
        // Verificar se há produtos duplicados
        if (produtosIds.has(item.produtoId)) {
          toast({
            title: "Erro",
            description: "Não é possível ter o mesmo produto em linhas diferentes. Cada item só pode aparecer uma vez.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
        produtosIds.add(item.produtoId)
      }

      await createMerchandiseEntry(
        {
          cliente_id: formData.cliente_id,
          numero_nota_fiscal: formData.numero_nota_fiscal.trim(),
          data_nota: new Date(formData.data_nota).toISOString(),
          status: "Pendente",
          created_by: user!.id,
        },
        formData.items.map((item) => ({
          produto_id: item.produtoId,
          produto_nome: item.produtoNome,
          quantidade: item.quantidade,
        }))
      )

      toast({
        title: "Sucesso",
        description: "Entrada de mercadoria registrada com sucesso",
      })

      // Limpar formulário
      setFormData({
        cliente_id: "",
        numero_nota_fiscal: "",
        data_nota: new Date().toISOString().split("T")[0],
        items: [],
      })
      // Reset filtros de produtos
      setProdutoFiltroMarca("all")
      setProdutoFiltroTipo("all")
      setProdutoFiltroCategoria("all")
      setProdutoBusca("")
      setShowAddForm(false)

      // Recarregar lista
      const entradasData = await getMerchandiseEntries(user!.id, user!.role)
      setEntradas(entradasData || [])
    } catch (error: any) {
      console.error("[v0] Error creating merchandise entry:", error)
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível registrar a entrada",
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

  const entradasFiltradas = entradas.filter((entrada) => {
    const matchSearch =
      entrada.numero_nota_fiscal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrada.clients?.nome?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchStatus = statusFiltro === "todos" || entrada.status === statusFiltro

    return matchSearch && matchStatus
  })

  if (isLoading) {
    return (
      <ProtectedRoute>
        <main className="p-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </main>
      </ProtectedRoute>
    )
  }

  const entradasRelatorioFiltradas = entradasComLinks.filter((entrada) => {
    const matchCliente = relatorioClienteFiltro === "todos" || entrada.cliente_id === relatorioClienteFiltro
    const matchStatus = relatorioStatusFiltro === "todos" || entrada.status === relatorioStatusFiltro
    return matchCliente && matchStatus
  })

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Entrada de Mercadoria</h1>
            <p className="text-muted-foreground">Registre as entradas de mercadoria recebidas</p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Entrada
          </Button>
        </div>

        <Tabs defaultValue="entradas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="entradas">Entradas</TabsTrigger>
            <TabsTrigger value="relatorios" onClick={loadRelatorios}>
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entradas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="search">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Buscar por nota fiscal ou cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="w-full space-y-2 md:w-48">
                    <Label htmlFor="status">Status</Label>
                    <Select value={statusFiltro} onValueChange={(value: any) => setStatusFiltro(value)}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Concluída">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entradas Registradas</CardTitle>
                <CardDescription>
                  {entradasFiltradas.length} entrada(s) encontrada(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {entradasFiltradas.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhuma entrada encontrada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nota Fiscal</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data da Nota</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data de Registro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entradasFiltradas.map((entrada) => (
                        <TableRow key={entrada.id}>
                          <TableCell className="font-medium">{entrada.numero_nota_fiscal}</TableCell>
                          <TableCell>{entrada.clients?.nome || "N/A"}</TableCell>
                          <TableCell>{formatDate(entrada.data_nota)}</TableCell>
                          <TableCell>
                            <Badge variant={entrada.status === "Concluída" ? "default" : "secondary"}>
                              {entrada.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(entrada.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relatorios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="relatorio-cliente">Cliente</Label>
                    <Select
                      value={relatorioClienteFiltro}
                      onValueChange={setRelatorioClienteFiltro}
                    >
                      <SelectTrigger id="relatorio-cliente">
                        <SelectValue placeholder="Todos os clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {clientes
                          .filter((c) => c.ativo)
                          .map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full space-y-2 md:w-48">
                    <Label htmlFor="relatorio-status">Status</Label>
                    <Select
                      value={relatorioStatusFiltro}
                      onValueChange={(value: any) => setRelatorioStatusFiltro(value)}
                    >
                      <SelectTrigger id="relatorio-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Concluída">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Relatório de Entradas e Vínculos</CardTitle>
                <CardDescription>
                  {entradasRelatorioFiltradas.length} entrada(s) encontrada(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRelatorios ? (
                  <div className="py-8 text-center text-muted-foreground">Carregando...</div>
                ) : entradasRelatorioFiltradas.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhuma entrada encontrada
                  </div>
                ) : (
                  <div className="space-y-6">
                    {entradasRelatorioFiltradas.map((entrada) => (
                      <Card key={entrada.id} className="p-4">
                        <div className="mb-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">
                                Nota Fiscal: {entrada.numero_nota_fiscal}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Cliente: {entrada.clients?.nome || "N/A"} | Data:{" "}
                                {formatDate(entrada.data_nota)}
                              </p>
                            </div>
                            <Badge variant={entrada.status === "Concluída" ? "default" : "secondary"}>
                              {entrada.status}
                            </Badge>
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead>Quantidade</TableHead>
                              <TableHead>Status Vínculo</TableHead>
                              <TableHead>Pedido Vinculado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entrada.merchandise_entry_items?.map((item: any) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.produto_nome}</TableCell>
                                <TableCell>{item.quantidade}</TableCell>
                                <TableCell>
                                  {item.vinculado ? (
                                    <Badge variant="default">
                                      <CheckCircle className="mr-1 h-3 w-3" />
                                      Vinculado
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Pendente</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {item.vinculado && item.order_items ? (
                                    <div className="text-sm">
                                      <div className="font-medium">
                                        {item.order_items.orders?.numero_pedido || "N/A"}
                                      </div>
                                      <div className="text-muted-foreground">
                                        {item.order_items.orders?.data_venda
                                          ? formatDate(item.order_items.orders.data_venda)
                                          : "-"}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog para Nova Entrada */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Entrada de Mercadoria</DialogTitle>
              <DialogDescription>
                Preencha os dados da entrada de mercadoria recebida
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente *</Label>
                    <Select
                      value={formData.cliente_id}
                      onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="cliente">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes
                          .filter((c) => c.ativo)
                          .map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero_nota">Número da Nota Fiscal *</Label>
                    <Input
                      id="numero_nota"
                      value={formData.numero_nota_fiscal}
                      onChange={(e) =>
                        setFormData({ ...formData, numero_nota_fiscal: e.target.value })
                      }
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_nota">Data da Nota *</Label>
                  <Input
                    id="data_nota"
                    type="date"
                    value={formData.data_nota}
                    onChange={(e) => setFormData({ ...formData, data_nota: e.target.value })}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Itens da Entrada *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Item
                    </Button>
                  </div>
                  
                  {/* Filtros para seleção de produtos */}
                  {formData.items.length > 0 && (
                    <Card className="p-4 bg-muted/50">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Filtros para Seleção de Produtos</Label>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                          <div className="space-y-2">
                            <Label htmlFor="produto-busca" className="text-xs">Buscar</Label>
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                id="produto-busca"
                                placeholder="Nome ou código..."
                                value={produtoBusca}
                                onChange={(e) => setProdutoBusca(e.target.value)}
                                className="pl-8 h-9"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="produto-marca" className="text-xs">Marca</Label>
                            <Select value={produtoFiltroMarca} onValueChange={setProdutoFiltroMarca}>
                              <SelectTrigger id="produto-marca" className="h-9">
                                <SelectValue placeholder="Todas" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {PRODUCT_MARCAS.map((marca) => (
                                  <SelectItem key={marca} value={marca}>
                                    {marca}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="produto-tipo" className="text-xs">Tipo</Label>
                            <Select value={produtoFiltroTipo} onValueChange={setProdutoFiltroTipo}>
                              <SelectTrigger id="produto-tipo" className="h-9">
                                <SelectValue placeholder="Todos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {tiposUnicos.map((tipo) => (
                                  <SelectItem key={tipo} value={tipo}>
                                    {tipo}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="produto-categoria" className="text-xs">Categoria</Label>
                            <Select value={produtoFiltroCategoria} onValueChange={setProdutoFiltroCategoria}>
                              <SelectTrigger id="produto-categoria" className="h-9">
                                <SelectValue placeholder="Todas" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {categoriasUnicas.map((categoria) => (
                                  <SelectItem key={categoria} value={categoria}>
                                    {categoria}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getProdutosFiltrados().length} produto(s) disponível(is) com os filtros aplicados
                        </div>
                      </div>
                    </Card>
                  )}
                  
                  {formData.items.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.items.map((item, index) => (
                        <Card key={index} className="p-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-8">
                            <div className="md:col-span-5">
                              <Label>Produto *</Label>
                              <Select
                                value={item.produtoId}
                                onValueChange={(value) => handleItemChange(index, "produtoId", value)}
                                disabled={isSubmitting}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um produto" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(() => {
                                    const produtosDisponiveis = getProdutosFiltrados(item.produtoId)
                                    // Sempre incluir o produto atual se já estiver selecionado
                                    const produtoAtual = item.produtoId 
                                      ? produtos.find((p) => p.id === item.produtoId)
                                      : null
                                    
                                    const produtosParaExibir = produtoAtual && !produtosDisponiveis.find(p => p.id === produtoAtual.id)
                                      ? [produtoAtual, ...produtosDisponiveis]
                                      : produtosDisponiveis
                                    
                                    if (produtosParaExibir.length === 0) {
                                      return (
                                        <SelectItem value="none" disabled>
                                          Nenhum produto encontrado com os filtros aplicados
                                        </SelectItem>
                                      )
                                    }
                                    
                                    return produtosParaExibir.map((produto) => (
                                      <SelectItem key={produto.id} value={produto.id}>
                                        {produto.nome}
                                        {produto.codigo_fabrica && ` (${produto.codigo_fabrica})`}
                                        {produto.codigo_sachs && ` - ${produto.codigo_sachs}`}
                                      </SelectItem>
                                    ))
                                  })()}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-2">
                              <Label>Quantidade *</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantidade}
                                onChange={(e) =>
                                  handleItemChange(index, "quantidade", parseInt(e.target.value) || 1)
                                }
                                disabled={isSubmitting}
                                required
                              />
                            </div>
                            <div className="md:col-span-1 flex items-end">
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                                disabled={isSubmitting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar Entrada"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}

