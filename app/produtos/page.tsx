"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Filter, ChevronDown, ChevronUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  isProductUsedInOrders,
  type DatabaseProduct,
} from "@/lib/supabase/database"

export default function ProdutosPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<DatabaseProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterMarca, setFilterMarca] = useState<string>("all")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [filterCategoria, setFilterCategoria] = useState<string>("all")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<DatabaseProduct | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [productUsageMap, setProductUsageMap] = useState<Record<string, boolean>>({})

  const [formData, setFormData] = useState({
    nome: "",
    marca: "",
    tipo: "",
    categoria: "kit",
    preco_base: "",
    desconto_maximo_bt: "",
    ativo: true,
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await getAllProducts()
      setProducts(data)
      
      // Verificar quais produtos estão sendo usados em pedidos
      const usageMap: Record<string, boolean> = {}
      for (const product of data) {
        try {
          usageMap[product.id] = await isProductUsedInOrders(product.id)
        } catch (error) {
          console.error(`[v0] Error checking usage for product ${product.id}:`, error)
          usageMap[product.id] = false
        }
      }
      setProductUsageMap(usageMap)
    } catch (error) {
      console.error("[v0] Error loading products:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const marcas = Array.from(new Set(products.map((p) => p.marca))).sort()
  const tipos = Array.from(new Set(products.map((p) => p.tipo))).sort()

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.marca.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMarca = filterMarca === "all" || product.marca === filterMarca
    const matchesTipo = filterTipo === "all" || product.tipo === filterTipo
    const matchesCategoria = filterCategoria === "all" || product.categoria === filterCategoria

    return matchesSearch && matchesMarca && matchesTipo && matchesCategoria
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validação dos campos obrigatórios
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do produto é obrigatório",
        variant: "destructive",
      })
      return
    }

    if (!formData.marca) {
      toast({
        title: "Erro",
        description: "A marca é obrigatória",
        variant: "destructive",
      })
      return
    }

    if (!formData.tipo) {
      toast({
        title: "Erro",
        description: "O tipo de veículo é obrigatório",
        variant: "destructive",
      })
      return
    }

    if (!formData.preco_base || Number(formData.preco_base) <= 0) {
      toast({
        title: "Erro",
        description: "O preço base deve ser maior que zero",
        variant: "destructive",
      })
      return
    }

    if (!formData.desconto_maximo_bt || Number(formData.desconto_maximo_bt) < 0) {
      toast({
        title: "Erro",
        description: "O desconto máximo deve ser maior ou igual a zero",
        variant: "destructive",
      })
      return
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          nome: formData.nome.trim(),
          marca: formData.marca,
          tipo: formData.tipo,
          categoria: formData.categoria,
          preco_base: Number(formData.preco_base),
          desconto_maximo_bt: Number(formData.desconto_maximo_bt),
          ativo: formData.ativo,
        })

        toast({
          title: "Sucesso",
          description: "Produto atualizado com sucesso",
        })
        setEditingProduct(null)
      } else {
        await createProduct({
          nome: formData.nome.trim(),
          marca: formData.marca,
          tipo: formData.tipo,
          categoria: formData.categoria,
          preco_base: Number(formData.preco_base),
          desconto_maximo_bt: Number(formData.desconto_maximo_bt),
          ativo: formData.ativo,
        })

        toast({
          title: "Sucesso",
          description: "Produto cadastrado com sucesso",
        })
      }

      await loadProducts()
      setFormData({
        nome: "",
        marca: "",
        tipo: "",
        categoria: "kit",
        preco_base: "",
        desconto_maximo_bt: "",
        ativo: true,
      })
      setShowAddForm(false)
    } catch (error: any) {
      console.error("[v0] Error saving product:", error)
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível salvar o produto",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (product: DatabaseProduct) => {
    setEditingProduct(product)
    setFormData({
      nome: product.nome,
      marca: product.marca,
      tipo: product.tipo,
      categoria: product.categoria,
      preco_base: product.preco_base.toString(),
      desconto_maximo_bt: product.desconto_maximo_bt.toString(),
      ativo: product.ativo,
    })
    setShowAddForm(true)
  }

  const handleDelete = async (productId: string) => {
    // Verificar se o produto está sendo usado
    const isUsed = productUsageMap[productId]
    
    if (isUsed) {
      toast({
        title: "Não é possível excluir",
        description: "Este produto já foi usado em pedidos anteriores. Você pode inativá-lo ao invés de excluir.",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Tem certeza que deseja excluir este produto?")) return

    try {
      await deleteProduct(productId)
      await loadProducts()
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso",
      })
    } catch (error: any) {
      console.error("[v0] Error deleting product:", error)
      const errorMessage = error?.message || "Não foi possível excluir o produto"
      
      // Se o erro for sobre produto usado, sugerir inativar
      if (errorMessage.includes("usado em pedidos")) {
        toast({
          title: "Não é possível excluir",
          description: "Este produto já foi usado em pedidos anteriores. Você pode inativá-lo ao invés de excluir.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        })
      }
    }
  }

  const handleToggleActive = async (product: DatabaseProduct) => {
    try {
      await updateProduct(product.id, {
        ativo: !product.ativo,
      })
      await loadProducts()
      toast({
        title: "Sucesso",
        description: `Produto ${!product.ativo ? "ativado" : "inativado"} com sucesso`,
      })
    } catch (error: any) {
      console.error("[v0] Error toggling product active status:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do produto",
        variant: "destructive",
      })
    }
  }

  const getCategoryLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      kit: "Kit",
      plato: "Platô",
      mancal: "Mancal",
      disco: "Disco",
      outros: "Outros",
    }
    return labels[categoria] || categoria
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin", "Gerente", "Coordenador", "Vendedor"]}>
        <main className="p-4 md:p-6">
          <div className="text-center py-8">Carregando produtos...</div>
        </main>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "Gerente", "Coordenador", "Vendedor"]}>
      <main className="p-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">Produtos</h1>
              <p className="text-sm text-muted-foreground md:text-base">
                Gerencie o catálogo de produtos por Marca, Tipo e Categoria
              </p>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2 w-full md:w-auto">
              <Plus className="h-4 w-4" />
              {showAddForm ? "Cancelar" : "Novo Produto"}
            </Button>
          </div>
        </div>

        {showAddForm && (
          <Card className="mb-4 md:mb-6">
            <CardHeader>
              <CardTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</CardTitle>
              <CardDescription>Preencha os dados do produto</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Produto *</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Kit Embreagem Mercedes 1620"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marca">Marca *</Label>
                    <Select
                      value={formData.marca}
                      onValueChange={(value) => setFormData({ ...formData, marca: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a marca" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mercedes">Mercedes</SelectItem>
                        <SelectItem value="Ford">Ford</SelectItem>
                        <SelectItem value="Scania">Scania</SelectItem>
                        <SelectItem value="Volvo">Volvo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo Veículo *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Caminhão">Caminhão</SelectItem>
                        <SelectItem value="Ônibus">Ônibus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria *</Label>
                    <Select
                      value={formData.categoria}
                      onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kit">Kit</SelectItem>
                        <SelectItem value="plato">Platô</SelectItem>
                        <SelectItem value="mancal">Mancal</SelectItem>
                        <SelectItem value="disco">Disco</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preco_base">Preço Base (R$) *</Label>
                    <Input
                      id="preco_base"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.preco_base}
                      onChange={(e) => setFormData({ ...formData, preco_base: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="desconto_maximo_bt">Desconto Máximo (%) *</Label>
                    <Input
                      id="desconto_maximo_bt"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.desconto_maximo_bt}
                      onChange={(e) => setFormData({ ...formData, desconto_maximo_bt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="ativo">Produto Ativo</Label>
                </div>

                <div className="flex flex-col gap-2 md:flex-row">
                  <Button type="submit" className="w-full md:w-auto">
                    {editingProduct ? "Salvar Alterações" : "Cadastrar Produto"}
                  </Button>
                  {editingProduct && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full md:w-auto bg-transparent"
                      onClick={() => {
                        setEditingProduct(null)
                        setFormData({
                          nome: "",
                          marca: "",
                          tipo: "",
                          categoria: "kit",
                          preco_base: "",
                          desconto_maximo_bt: "",
                          ativo: true,
                        })
                        setShowAddForm(false)
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg md:text-xl">Produtos ({filteredProducts.length})</CardTitle>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-between md:hidden"
                >
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </span>
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>

              <div className={`flex-col gap-3 ${showFilters ? "flex" : "hidden"} md:flex md:flex-row md:items-center`}>
                <Filter className="hidden h-4 w-4 text-muted-foreground md:block" />
                <Select value={filterMarca} onValueChange={setFilterMarca}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Marcas</SelectItem>
                    {marcas.map((marca) => (
                      <SelectItem key={marca} value={marca}>
                        {marca}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Tipos</SelectItem>
                    {tipos.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Categorias</SelectItem>
                    <SelectItem value="kit">Kit</SelectItem>
                    <SelectItem value="plato">Platô</SelectItem>
                    <SelectItem value="mancal">Mancal</SelectItem>
                    <SelectItem value="disco">Disco</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>

                {(filterMarca !== "all" || filterTipo !== "all" || filterCategoria !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full md:w-auto"
                    onClick={() => {
                      setFilterMarca("all")
                      setFilterTipo("all")
                      setFilterCategoria("all")
                    }}
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="block md:hidden space-y-3">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-base leading-tight">{product.nome}</h3>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(product.categoria)}
                            </Badge>
                            <Badge variant={product.ativo ? "default" : "secondary"} className="text-xs">
                              {product.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Marca:</span>
                          <p className="font-medium text-foreground">{product.marca}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tipo:</span>
                          <p className="font-medium text-foreground">{product.tipo}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Preço Base:</span>
                          <p className="font-semibold text-foreground">
                            R$ {product.preco_base.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Desc. Máx:</span>
                          <p className="font-medium text-foreground">{product.desconto_maximo_bt}%</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(product)}
                          className="flex-1 gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        {productUsageMap[product.id] ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => handleToggleActive(product)}
                            title="Produto usado em pedidos - apenas inativar"
                          >
                            {product.ativo ? "Inativar" : "Ativar"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-2 text-destructive border-destructive/50 hover:bg-destructive/10 bg-transparent"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</div>
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Produto</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Marca</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Tipo</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Categoria</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Preço Base</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Desconto Máx.</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-border">
                      <td className="py-4 text-sm font-medium text-foreground">{product.nome}</td>
                      <td className="py-4 text-sm text-muted-foreground">{product.marca}</td>
                      <td className="py-4 text-sm text-muted-foreground">{product.tipo}</td>
                      <td className="py-4 text-sm text-muted-foreground">
                        <Badge variant="outline">{getCategoryLabel(product.categoria)}</Badge>
                      </td>
                      <td className="py-4 text-sm text-foreground">
                        R$ {product.preco_base.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">{product.desconto_maximo_bt}%</td>
                      <td className="py-4">
                        <Badge variant={product.ativo ? "default" : "secondary"}>
                          {product.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {productUsageMap[product.id] ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleActive(product)}
                              title="Produto usado em pedidos - apenas inativar"
                            >
                              {product.ativo ? "Inativar" : "Ativar"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </ProtectedRoute>
  )
}
