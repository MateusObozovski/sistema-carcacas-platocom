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
import type { Product } from "@/lib/types"
import { mockProducts } from "@/lib/mock-data"

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterMarca, setFilterMarca] = useState<string>("all")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [filterCategoria, setFilterCategoria] = useState<string>("all")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    marca: "",
    tipo: "",
    categoria: "kit" as Product["categoria"],
    precoBase: "",
    descontoMaximo: "",
    ativo: true,
  })

  useEffect(() => {
    const stored = localStorage.getItem("products")
    if (stored) {
      setProducts(JSON.parse(stored))
    } else {
      setProducts(mockProducts)
      localStorage.setItem("products", JSON.stringify(mockProducts))
    }
  }, [])

  const marcas = Array.from(new Set(products.map((p) => p.marca))).sort()
  const tipos = Array.from(new Set(products.map((p) => p.tipo))).sort()

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.marca.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMarca = filterMarca === "all" || product.marca === filterMarca
    const matchesTipo = filterTipo === "all" || product.tipo === filterTipo
    const matchesCategoria = filterCategoria === "all" || product.categoria === filterCategoria

    return matchesSearch && matchesMarca && matchesTipo && matchesCategoria
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingProduct) {
      const updatedProducts = products.map((p) =>
        p.id === editingProduct.id
          ? {
              ...editingProduct,
              name: formData.name,
              marca: formData.marca,
              tipo: formData.tipo,
              categoria: formData.categoria,
              precoBase: Number(formData.precoBase),
              descontoMaximo: Number(formData.descontoMaximo),
              ativo: formData.ativo,
            }
          : p,
      )
      setProducts(updatedProducts)
      localStorage.setItem("products", JSON.stringify(updatedProducts))
      setEditingProduct(null)
    } else {
      const newProduct: Product = {
        id: `prod${Date.now()}`,
        name: formData.name,
        marca: formData.marca,
        tipo: formData.tipo,
        categoria: formData.categoria,
        precoBase: Number(formData.precoBase),
        descontoMaximo: Number(formData.descontoMaximo),
        ativo: formData.ativo,
        dataCriacao: new Date().toISOString().split("T")[0],
      }
      const updatedProducts = [...products, newProduct]
      setProducts(updatedProducts)
      localStorage.setItem("products", JSON.stringify(updatedProducts))
    }

    setFormData({
      name: "",
      marca: "",
      tipo: "",
      categoria: "kit",
      precoBase: "",
      descontoMaximo: "",
      ativo: true,
    })
    setShowAddForm(false)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      marca: product.marca,
      tipo: product.tipo,
      categoria: product.categoria,
      precoBase: product.precoBase.toString(),
      descontoMaximo: product.descontoMaximo.toString(),
      ativo: product.ativo,
    })
    setShowAddForm(true)
  }

  const handleDelete = (productId: string) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      const updatedProducts = products.filter((p) => p.id !== productId)
      setProducts(updatedProducts)
      localStorage.setItem("products", JSON.stringify(updatedProducts))
    }
  }

  const getCategoryLabel = (categoria: Product["categoria"]) => {
    const labels = {
      kit: "Kit",
      plato: "Platô",
      mancal: "Mancal",
      disco: "Disco",
      outros: "Outros",
    }
    return labels[categoria]
  }

  return (
    <ProtectedRoute allowedRoles={["Patrão", "Gerente"]}>
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
                    <Label htmlFor="name">Nome do Produto</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Kit Embreagem Mercedes 1620"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marca">Marca</Label>
                    <Input
                      id="marca"
                      placeholder="Ex: Mercedes, Ford, Volvo"
                      value={formData.marca}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo</Label>
                    <Input
                      id="tipo"
                      placeholder="Ex: Caminhões, Ônibus"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select
                      value={formData.categoria}
                      onValueChange={(value: Product["categoria"]) => setFormData({ ...formData, categoria: value })}
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
                    <Label htmlFor="precoBase">Preço Base (R$)</Label>
                    <Input
                      id="precoBase"
                      type="number"
                      step="0.01"
                      value={formData.precoBase}
                      onChange={(e) => setFormData({ ...formData, precoBase: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descontoMaximo">Desconto Máximo (%)</Label>
                    <Input
                      id="descontoMaximo"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.descontoMaximo}
                      onChange={(e) => setFormData({ ...formData, descontoMaximo: e.target.value })}
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
                          name: "",
                          marca: "",
                          tipo: "",
                          categoria: "kit",
                          precoBase: "",
                          descontoMaximo: "",
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
                          <h3 className="font-semibold text-foreground text-base leading-tight">{product.name}</h3>
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
                            R$ {product.precoBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Desc. Máx:</span>
                          <p className="font-medium text-foreground">{product.descontoMaximo}%</p>
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
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-2 text-destructive border-destructive/50 hover:bg-destructive/10 bg-transparent"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
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
                      <td className="py-4 text-sm font-medium text-foreground">{product.name}</td>
                      <td className="py-4 text-sm text-muted-foreground">{product.marca}</td>
                      <td className="py-4 text-sm text-muted-foreground">{product.tipo}</td>
                      <td className="py-4 text-sm text-muted-foreground">
                        <Badge variant="outline">{getCategoryLabel(product.categoria)}</Badge>
                      </td>
                      <td className="py-4 text-sm text-foreground">
                        R$ {product.precoBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 text-sm text-muted-foreground">{product.descontoMaximo}%</td>
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
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
