"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { mockClientes, generatePedidoNumero } from "@/lib/mock-data"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { OrderItem, Product } from "@/lib/types"
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
  const [tipoVenda, setTipoVenda] = useState<"normal" | "base-troca">("normal")
  const [observacoes, setObservacoes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [produtos, setProdutos] = useState<Product[]>([])
  const [filterMarca, setFilterMarca] = useState<string>("all")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [filterCategoria, setFilterCategoria] = useState<string>("all")

  const [items, setItems] = useState<OrderItem[]>([])
  const [currentProdutoId, setCurrentProdutoId] = useState("")
  const [currentQuantidade, setCurrentQuantidade] = useState(1)
  const [currentPreco, setCurrentPreco] = useState(0)
  const [currentDesconto, setCurrentDesconto] = useState(10)

  const loadProducts = () => {
    const stored = localStorage.getItem("products")
    if (stored) {
      const allProducts = JSON.parse(stored)
      const activeProducts = allProducts.filter((p: Product) => p.ativo)
      setProdutos(activeProducts)
      toast({
        title: "Produtos atualizados",
        description: `${activeProducts.length} produtos disponíveis`,
      })
    } else {
      setProdutos([])
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const clientesDisponiveis =
    user?.role === "vendedor" ? mockClientes.filter((c) => c.vendedorId === user.id) : mockClientes

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

    const precoOriginal = produto.precoBase
    const valorDesconto = tipoVenda === "base-troca" ? (currentPreco * currentDesconto) / 100 : 0
    const precoFinal = currentPreco - valorDesconto
    const subtotal = precoFinal * currentQuantidade
    const debitoCarcaca = valorDesconto * currentQuantidade

    const newItem: OrderItem = {
      id: `item-${Date.now()}`,
      produtoId: currentProdutoId,
      produtoNome: produto.name,
      quantidade: currentQuantidade,
      precoUnitario: precoFinal,
      precoOriginal: precoOriginal,
      desconto: tipoVenda === "base-troca" ? currentDesconto : 0,
      subtotal,
      debitoCarcaca,
    }

    setItems([...items, newItem])
    setCurrentProdutoId("")
    setCurrentQuantidade(1)
    setCurrentPreco(0)

    toast({
      title: "Item adicionado",
      description: `${produto.name} adicionado ao carrinho`,
    })
  }

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId))
  }

  const handleProdutoChange = (produtoId: string) => {
    setCurrentProdutoId(produtoId)
    const produto = produtos.find((p) => p.id === produtoId)
    if (produto) {
      setCurrentPreco(produto.precoBase)
    }
  }

  const atualizarQuantidade = (itemId: string, novaQuantidade: number) => {
    if (novaQuantidade < 1) return
    setItems(items.map(item => {
      if (item.id === itemId) {
        const subtotal = item.precoUnitario * novaQuantidade
        const debitoCarcaca = item.desconto > 0 
          ? (item.precoOriginal * item.desconto / 100) * novaQuantidade 
          : 0
        return { ...item, quantidade: novaQuantidade, subtotal, debitoCarcaca }
      }
      return item
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!clienteId || items.length === 0) {
      toast({
        title: "Erro",
        description: items.length === 0 ? "Adicione pelo menos um item" : "Selecione um cliente",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    const numeroPedido = generatePedidoNumero()

    const novoPedido = {
      id: `p${Date.now()}`,
      numero: numeroPedido,
      clienteId,
      vendedorId: user?.id || "",
      produto: items.map((i) => i.produtoNome).join(", "),
      tipoVenda,
      precoOriginal: totalOriginal,
      desconto: tipoVenda === "base-troca" ? currentDesconto : 0,
      precoFinal: totalFinal,
      debitoCarcaca: totalDebitoCarcaca,
      items,
      statusCarcaca: tipoVenda === "base-troca" ? ("aguardando" as const) : ("devolvida" as const),
      dataCriacao: new Date().toISOString().split("T")[0],
      dataPrevisaoDevolucao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      observacoes,
    }

    const pedidosExistentes = JSON.parse(localStorage.getItem("pedidos") || "[]")
    pedidosExistentes.push(novoPedido)
    localStorage.setItem("pedidos", JSON.stringify(pedidosExistentes))

    toast({
      title: "Venda registrada!",
      description: `Pedido ${numeroPedido} criado com sucesso`,
    })

    setTimeout(() => {
      router.push(`/pedidos/${numeroPedido}`)
    }, 1000)
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
                            {cliente.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Tipo de Venda *</Label>
                    <RadioGroup value={tipoVenda} onValueChange={(v) => setTipoVenda(v as "normal" | "base-troca")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="normal" id="normal" />
                        <Label htmlFor="normal" className="font-normal cursor-pointer">
                          Venda Normal (sem carcaça)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="base-troca" id="base-troca" />
                        <Label htmlFor="base-troca" className="font-normal cursor-pointer">
                          Base de Troca (desconto de 5% a 15%)
                        </Label>
                      </div>
                    </RadioGroup>
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
                                {produto.name} - {formatCurrency(produto.precoBase)}
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

                    {tipoVenda === "base-troca" && (
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
                    )}
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
                                Débito: {formatCurrency(item.debitoCarcaca)}
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
                        <span className="text-orange-500">Débito Carcaças</span>
                        <span className="font-medium text-orange-500">{formatCurrency(totalDebitoCarcaca)}</span>
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
                    disabled={isSubmitting || !clienteId || items.length === 0}
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
