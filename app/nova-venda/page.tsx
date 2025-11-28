"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { getClients, generateOrderNumber, getProducts, createOrder, getVendedores, type DatabaseProduct } from "@/lib/supabase/database"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { OrderItem } from "@/lib/types"
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Calculator,
  Package,
  User,
  AlertCircle,
  RefreshCw,
  Filter
} from "lucide-react"

export default function NovaVendaPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [clienteId, setClienteId] = useState("")
  const [vendedorId, setVendedorId] = useState("")
  const tipoVenda = "base-troca" // Todas as vendas são Base de Troca
  const [observacoes, setObservacoes] = useState("")
  const [numeroPedidoOrigem, setNumeroPedidoOrigem] = useState("")
  const [empresa, setEmpresa] = useState<"Platocom" | "R.D.C" | "Rita de Cássia" | "Tork" | "Thiago" | "none">("none")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [vendedores, setVendedores] = useState<any[]>([])

  const [produtos, setProdutos] = useState<DatabaseProduct[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [filterMarca, setFilterMarca] = useState<string>("all")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [filterCategoria, setFilterCategoria] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)

  const [items, setItems] = useState<OrderItem[]>([])
  const [currentProdutoId, setCurrentProdutoId] = useState("")
  const [currentQuantidade, setCurrentQuantidade] = useState(1)
  const [currentPreco, setCurrentPreco] = useState(0)
  const [currentDesconto, setCurrentDesconto] = useState(10)

  const loadProducts = async () => {
    try {
      const productsData = await getProducts()
      setProdutos(productsData)
      toast({
        title: "Produtos atualizados",
        description: `${productsData.length} produtos disponíveis`,
      })
    } catch (error) {
      console.error("[v0] Error loading products:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const [productsData, clientsData] = await Promise.all([
          getProducts(),
          user?.role === "Vendedor" ? getClients(user.id) : getClients(),
        ])
        setProdutos(productsData)
        setClientes(clientsData)

        // Se não for vendedor, carregar lista de vendedores
        if (user && user.role !== "Vendedor") {
          const vendedoresData = await getVendedores()
          setVendedores(vendedoresData)
        } else if (user?.role === "Vendedor") {
          // Se for vendedor, definir automaticamente
          setVendedorId(user.id)
        }
      } catch (error) {
        console.error("[v0] Error loading data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user])

  const clientesDisponiveis = clientes

  const marcas = Array.from(new Set(produtos.map((p) => p.marca))).sort()
  const tipos = Array.from(new Set(produtos.map((p) => p.tipo))).sort()

  const produtosFiltrados = produtos.filter((product) => {
    const matchesMarca = filterMarca === "all" || product.marca === filterMarca
    const matchesTipo = filterTipo === "all" || product.tipo === filterTipo
    const matchesCategoria = filterCategoria === "all" || product.categoria === filterCategoria
    return matchesMarca && matchesTipo && matchesCategoria
  })

  const totalOriginal = items.reduce((sum, item) => sum + item.precoOriginal * item.quantidade, 0)
  const totalDesconto = items.reduce(
    (sum, item) => sum + (item.precoOriginal - item.precoUnitario) * item.quantidade,
    0,
  )
  const totalFinal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const totalDebitoCarcaca = items.reduce((sum, item) => sum + item.debitoCarcaca, 0)

  const handleAddItem = () => {
    if (!currentProdutoId) {
      toast({
        title: "Erro",
        description: "Selecione um produto",
        variant: "destructive",
      })
      return
    }

    const produto = produtos.find((p) => p.id === currentProdutoId)
    if (!produto) return

    const precoOriginal = produto.preco_base
    const valorDesconto = (currentPreco * currentDesconto) / 100
    const precoFinal = currentPreco - valorDesconto
    const subtotal = precoFinal * currentQuantidade
    // debito_carcaca deve ser a quantidade de carcaças, não o valor monetário
    const debitoCarcaca = currentQuantidade

    const newItem: OrderItem = {
      id: `item-${Date.now()}`,
      produtoId: currentProdutoId,
      produtoNome: produto.nome,
      quantidade: currentQuantidade,
      precoUnitario: precoFinal,
      precoOriginal: precoOriginal,
      desconto: currentDesconto,
      subtotal,
      debitoCarcaca,
    }

    setItems([...items, newItem])
    setCurrentProdutoId("")
    setCurrentQuantidade(1)
    setCurrentPreco(0)

    toast({
      title: "Item adicionado",
      description: `${produto.nome} adicionado ao carrinho`,
    })
  }

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId))
  }

  const handleProdutoChange = (produtoId: string) => {
    setCurrentProdutoId(produtoId)
    const produto = produtos.find((p) => p.id === produtoId)
    if (produto) {
      setCurrentPreco(produto.preco_base)
      // Set max discount based on product
      setCurrentDesconto(Math.min(produto.desconto_maximo_bt, 15))
    }
  }

  const atualizarQuantidade = (itemId: string, novaQuantidade: number) => {
    if (novaQuantidade < 1) return
    setItems(items.map(item => {
      if (item.id === itemId) {
        const subtotal = item.precoUnitario * novaQuantidade
        // debito_carcaca deve ser a quantidade de carcaças, não o valor monetário
        const debitoCarcaca = novaQuantidade
        return { ...item, quantidade: novaQuantidade, subtotal, debitoCarcaca }
      }
      return item
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Determinar o vendedor responsável
    const vendedorResponsavel = user?.role === "Vendedor" ? user.id : vendedorId

    if (!clienteId || items.length === 0 || !vendedorResponsavel) {
      toast({
        title: "Erro",
        description: items.length === 0 
          ? "Adicione pelo menos um item" 
          : !clienteId 
          ? "Selecione um cliente"
          : "Selecione o vendedor responsável",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const numeroPedido = await generateOrderNumber()

      // Create order
      const order = {
        numero_pedido: numeroPedido,
        cliente_id: clienteId,
        vendedor_id: vendedorResponsavel,
        tipo_venda: "Base de Troca",
        valor_total: totalFinal,
        debito_carcaca: totalDebitoCarcaca,
        status: "Aguardando Devolução",
        data_venda: new Date().toISOString(),
        observacoes: observacoes || undefined,
        numero_pedido_origem: numeroPedidoOrigem.trim() || undefined,
        empresa: empresa && empresa !== "none" ? empresa : undefined,
      }

      // Create order items
      const orderItems = items.map((item) => ({
        produto_id: item.produtoId,
        produto_nome: item.produtoNome,
        quantidade: item.quantidade,
        preco_unitario: item.precoUnitario,
        desconto_percentual: item.desconto,
        preco_final: item.precoUnitario,
        debito_carcaca: item.debitoCarcaca,
        tipo_venda: "Base de Troca",
      }))

      await createOrder(order, orderItems)

      toast({
        title: "Venda registrada!",
        description: `Pedido ${numeroPedido} criado com sucesso`,
      })

      setTimeout(() => {
        router.push(`/pedidos/${numeroPedido}`)
      }, 1000)
    } catch (error) {
      console.error("[v0] Error creating order:", error)
      toast({
        title: "Erro",
        description: "Não foi possível registrar a venda",
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

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Nova Venda</h2>
            <p className="text-muted-foreground">Registre uma nova venda para seus clientes</p>
          </div>
          <Button onClick={loadProducts} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar Produtos
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Coluna Esquerda - Formulário */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card Cliente e Tipo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informações da Venda
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente *</Label>
                    <Select value={clienteId} onValueChange={setClienteId} required>
                      <SelectTrigger id="cliente">
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientesDisponiveis.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {user?.role !== "Vendedor" && (
                    <div className="space-y-2">
                      <Label htmlFor="vendedor">Vendedor Responsável *</Label>
                      <Select value={vendedorId} onValueChange={setVendedorId} required>
                        <SelectTrigger id="vendedor">
                          <SelectValue placeholder="Selecione o vendedor" />
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
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="numeroPedidoOrigem">Número do Pedido Origem</Label>
                      <Input
                        id="numeroPedidoOrigem"
                        placeholder="Ex: PED-12345"
                        value={numeroPedidoOrigem}
                        onChange={(e) => setNumeroPedidoOrigem(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="empresa">Empresa</Label>
                      <Select 
                        value={empresa || "none"} 
                        onValueChange={(v) => setEmpresa(v === "none" ? "" : (v as any))}
                      >
                        <SelectTrigger id="empresa">
                          <SelectValue placeholder="Selecione a empresa (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          <SelectItem value="Platocom">Platocom</SelectItem>
                          <SelectItem value="R.D.C">R.D.C</SelectItem>
                          <SelectItem value="Rita de Cássia">Rita de Cássia</SelectItem>
                          <SelectItem value="Tork">Tork</SelectItem>
                          <SelectItem value="Thiago">Thiago</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      placeholder="Informações adicionais..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Card Filtros */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros de Produtos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Marca</Label>
                      <Select value={filterMarca} onValueChange={setFilterMarca}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {marcas.map((marca) => (
                            <SelectItem key={marca} value={marca}>
                              {marca}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={filterTipo} onValueChange={setFilterTipo}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {tipos.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>
                              {tipo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="kit">Kit</SelectItem>
                          <SelectItem value="plato">Platô</SelectItem>
                          <SelectItem value="mancal">Mancal</SelectItem>
                          <SelectItem value="disco">Disco</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card Adicionar Produto */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Adicionar Produto
                  </CardTitle>
                  <CardDescription>
                    {produtosFiltrados.length} produtos disponíveis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Produto</Label>
                      <Select value={currentProdutoId} onValueChange={handleProdutoChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {produtosFiltrados.length === 0 ? (
                            <SelectItem value="none" disabled>
                              Nenhum produto
                            </SelectItem>
                          ) : (
                            produtosFiltrados.map((produto) => (
                              <SelectItem key={produto.id} value={produto.id}>
                                {produto.nome} - {formatCurrency(produto.preco_base)}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={currentQuantidade}
                        onChange={(e) => setCurrentQuantidade(Number(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Preço Unitário</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentPreco}
                        onChange={(e) => setCurrentPreco(Number(e.target.value))}
                        disabled={!currentProdutoId}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Desconto (%)</Label>
                      <Input
                        type="number"
                        min="5"
                        max="15"
                        value={currentDesconto}
                        onChange={(e) => setCurrentDesconto(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <Button type="button" onClick={handleAddItem} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar ao Carrinho
                  </Button>
                </CardContent>
              </Card>

              {/* Card Carrinho */}
              {items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Carrinho ({items.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{item.produtoNome}</p>
                              {item.desconto > 0 && (
                                <Badge variant="secondary">{item.desconto}% desc</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(item.precoUnitario)} × {item.quantidade} = {formatCurrency(item.subtotal)}
                            </p>
                            {item.debitoCarcaca > 0 && (
                              <p className="text-xs text-orange-500">
                                Carcaças: {item.debitoCarcaca} carcaça(s)
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{item.quantidade}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}
                            >
                              +
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Coluna Direita - Resumo */}
            <div>
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Resumo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Itens</span>
                      <span className="font-medium">{items.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(totalOriginal)}</span>
                    </div>
                    {totalDesconto > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Desconto</span>
                        <span className="font-medium text-green-600">- {formatCurrency(totalDesconto)}</span>
                      </div>
                    )}
                    {totalDebitoCarcaca > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-500">Carcaças Pendentes</span>
                        <span className="font-medium text-orange-500">{totalDebitoCarcaca} carcaça(s)</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-lg font-bold">{formatCurrency(totalFinal)}</span>
                  </div>

                  {totalDebitoCarcaca > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Pedido com carcaças pendentes
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting || !clienteId || items.length === 0 || (user?.role !== "Vendedor" && !vendedorId)}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting ? "Processando..." : "Finalizar Venda"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
