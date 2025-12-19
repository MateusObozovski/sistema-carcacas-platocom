"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  isProductUsedInOrders,
  type DatabaseProduct,
} from "@/lib/supabase/database";
import { isAuthError } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { PRODUCT_MARCAS } from "@/lib/types";

export default function ProdutosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [products, setProducts] = useState<DatabaseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMarca, setFilterMarca] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DatabaseProduct | null>(
    null
  );
  const [showFilters, setShowFilters] = useState(false);
  const [productUsageMap, setProductUsageMap] = useState<
    Record<string, boolean>
  >({});

  const [formData, setFormData] = useState({
    codigo: "",
    codigo_fabricante: "",
    nome: "",
    marca: "",
    tipo: "",
    categoria: "kit",
    preco_base: "",
    desconto_maximo_bt: "",
    carcass_value: "",
    observacoes: "",
    ativo: true,
  });

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getAllProducts();

      setProducts(data);

      // Verificar quais produtos estão sendo usados em pedidos
      const usageMap: Record<string, boolean> = {};
      for (const product of data) {
        try {
          usageMap[product.id] = await isProductUsedInOrders(product.id);
        } catch (error: any) {
          console.error(
            `[v0] Error checking usage for product ${product.id}:`,
            error
          );
          // Se for erro de auth, não continuar verificando
          if (isAuthError(error)) {
            throw error;
          }
          usageMap[product.id] = false;
        }
      }

      setProductUsageMap(usageMap);
    } catch (error: any) {
      console.error("[v0] Error loading products:", error);

      // Verificar se é erro de autenticação
      if (isAuthError(error)) {
        toast({
          title: "Sessão expirada",
          description: "Sua sessão expirou. Por favor, faça login novamente.",
          variant: "destructive",
        });
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        toast({
          title: "Erro",
          description:
            "Não foi possível carregar os produtos. Tente novamente.",
          variant: "destructive",
        });
      }

      setProducts([]);
      setProductUsageMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [toast, router]);

  const tipos = Array.from(new Set(products.map((p) => p.tipo))).sort();

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.marca.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMarca = filterMarca === "all" || product.marca === filterMarca;
    const matchesTipo = filterTipo === "all" || product.tipo === filterTipo;
    const matchesCategoria =
      filterCategoria === "all" || product.categoria === filterCategoria;

    return matchesSearch && matchesMarca && matchesTipo && matchesCategoria;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação dos campos obrigatórios
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do produto é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!formData.marca) {
      toast({
        title: "Erro",
        description: "A marca é obrigatória",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tipo) {
      toast({
        title: "Erro",
        description: "O tipo de veículo é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!formData.preco_base || Number(formData.preco_base) <= 0) {
      toast({
        title: "Erro",
        description: "O preço base deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    if (!formData.carcass_value || Number(formData.carcass_value) < 0) {
      toast({
        title: "Erro",
        description: "O valor da carcaça deve ser maior ou igual a zero",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          codigo: formData.codigo.trim() || undefined,
          codigo_fabricante: formData.codigo_fabricante.trim() || undefined,
          nome: formData.nome.trim(),
          marca: formData.marca,
          tipo: formData.tipo,
          categoria: formData.categoria,
          preco_base: Number(formData.preco_base),
          desconto_maximo_bt: editingProduct.desconto_maximo_bt || 0, // Mantém o valor existente para compatibilidade
          carcass_value: Number(formData.carcass_value) || 0,
          observacoes: formData.observacoes.trim() || undefined,
          ativo: formData.ativo,
        });

        toast({
          title: "Sucesso",
          description: "Produto atualizado com sucesso",
        });
        setEditingProduct(null);
      } else {
        await createProduct({
          codigo: formData.codigo.trim() || undefined,
          codigo_fabricante: formData.codigo_fabricante.trim() || undefined,
          nome: formData.nome.trim(),
          marca: formData.marca,
          tipo: formData.tipo,
          categoria: formData.categoria,
          preco_base: Number(formData.preco_base),
          desconto_maximo_bt: 0, // Não é mais necessário, calculado pelo valor da carcaça
          carcass_value: Number(formData.carcass_value) || 0,
          observacoes: formData.observacoes.trim() || undefined,
          ativo: formData.ativo,
        });

        toast({
          title: "Sucesso",
          description: "Produto cadastrado com sucesso",
        });
      }

      await loadProducts();
      setFormData({
        codigo: "",
        codigo_fabricante: "",
        nome: "",
        marca: "",
        tipo: "",
        categoria: "kit",
        preco_base: "",
        desconto_maximo_bt: "",
        carcass_value: "",
        observacoes: "",
        ativo: true,
      });
      setShowCreateDialog(false);
      setEditingProduct(null);
    } catch (error: any) {
      console.error("[v0] Error saving product:", error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível salvar o produto",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: DatabaseProduct) => {
    setEditingProduct(product);
    setFormData({
      codigo: product.codigo || "",
      codigo_fabricante: product.codigo_fabricante || "",
      nome: product.nome,
      marca: product.marca,
      tipo: product.tipo,
      categoria: product.categoria,
      preco_base: product.preco_base.toString(),
      desconto_maximo_bt: product.desconto_maximo_bt.toString(),
      carcass_value: (product.carcass_value || 0).toString(),
      observacoes: product.observacoes || "",
      ativo: product.ativo,
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (productId: string) => {
    // Verificar se o produto está sendo usado
    const isUsed = productUsageMap[productId];

    if (isUsed) {
      toast({
        title: "Não é possível excluir",
        description:
          "Este produto já foi usado em pedidos anteriores. Você pode inativá-lo ao invés de excluir.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      await deleteProduct(productId);
      await loadProducts();
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso",
      });
    } catch (error: any) {
      console.error("[v0] Error deleting product:", error);
      const errorMessage =
        error?.message || "Não foi possível excluir o produto";

      // Se o erro for sobre produto usado, sugerir inativar
      if (errorMessage.includes("usado em pedidos")) {
        toast({
          title: "Não é possível excluir",
          description:
            "Este produto já foi usado em pedidos anteriores. Você pode inativá-lo ao invés de excluir.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const handleToggleActive = async (product: DatabaseProduct) => {
    try {
      await updateProduct(product.id, {
        ativo: !product.ativo,
      });
      await loadProducts();
      toast({
        title: "Sucesso",
        description: `Produto ${
          !product.ativo ? "ativado" : "inativado"
        } com sucesso`,
      });
    } catch (error: any) {
      console.error("[v0] Error toggling product active status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do produto",
        variant: "destructive",
      });
    }
  };

  const getCategoryLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      kit: "Kit",
      plato: "Platô",
      mancal: "Mancal",
      disco: "Disco",
      outros: "Outros",
    };
    return labels[categoria] || categoria;
  };

  if (loading) {
    return (
      <ProtectedRoute
        allowedRoles={["admin", "Gerente", "Coordenador", "Vendedor"]}
      >
        <div className="text-center py-8">Carregando produtos...</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute
      allowedRoles={["admin", "Gerente", "Coordenador", "Vendedor"]}
    >
      <div className="space-y-6">
        <div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                Produtos
              </h1>
              <p className="text-sm text-muted-foreground md:text-base">
                Gerencie o catálogo de produtos por Marca, Tipo e Categoria
              </p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="gap-2 w-full md:w-auto"
            >
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </div>
        </div>

        <Dialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) {
              setEditingProduct(null);
              setFormData({
                codigo: "",
                codigo_fabricante: "",
                nome: "",
                marca: "",
                tipo: "",
                categoria: "kit",
                preco_base: "",
                desconto_maximo_bt: "",
                carcass_value: "",
                observacoes: "",
                ativo: true,
              });
            }
          }}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do produto
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    placeholder="Código do produto"
                    value={formData.codigo}
                    onChange={(e) =>
                      setFormData({ ...formData, codigo: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo_fabricante">Código Fabricante</Label>
                  <Input
                    id="codigo_fabricante"
                    placeholder="Código do fabricante"
                    value={formData.codigo_fabricante}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        codigo_fabricante: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Produto *</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Kit Embreagem Mercedes 1620"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marca">Marca *</Label>
                  <Select
                    value={formData.marca}
                    onValueChange={(value) =>
                      setFormData({ ...formData, marca: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_MARCAS.map((marca) => (
                        <SelectItem key={marca} value={marca}>
                          {marca}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo Veículo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo: value })
                    }
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
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoria: value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, preco_base: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="carcass_value">Valor da Carcaça (R$) *</Label>
                  <Input
                    id="carcass_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.carcass_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        carcass_value: e.target.value,
                      })
                    }
                    required
                    placeholder="Ex: 100.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor fixo em reais que representa o desconto máximo
                    permitido
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Observações sobre o produto..."
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) =>
                    setFormData({ ...formData, ativo: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="ativo">Produto Ativo</Label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingProduct(null);
                    setFormData({
                      codigo: "",
                      codigo_fabricante: "",
                      nome: "",
                      marca: "",
                      tipo: "",
                      categoria: "kit",
                      preco_base: "",
                      desconto_maximo_bt: "",
                      carcass_value: "",
                      observacoes: "",
                      ativo: true,
                    });
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProduct ? "Salvar Alterações" : "Cadastrar Produto"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg md:text-xl">
                    Produtos ({filteredProducts.length})
                  </CardTitle>
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
                  {showFilters ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div
                className={`flex-col gap-3 ${
                  showFilters ? "flex" : "hidden"
                } md:flex md:flex-row md:items-center`}
              >
                <Filter className="hidden h-4 w-4 text-muted-foreground md:block" />
                <Select value={filterMarca} onValueChange={setFilterMarca}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Marcas</SelectItem>
                    {PRODUCT_MARCAS.map((marca) => (
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

                <Select
                  value={filterCategoria}
                  onValueChange={setFilterCategoria}
                >
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

                {(filterMarca !== "all" ||
                  filterTipo !== "all" ||
                  filterCategoria !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full md:w-auto"
                    onClick={() => {
                      setFilterMarca("all");
                      setFilterTipo("all");
                      setFilterCategoria("all");
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
                          <h3 className="font-semibold text-foreground text-base leading-tight">
                            {product.nome}
                          </h3>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(product.categoria)}
                            </Badge>
                            <Badge
                              variant={product.ativo ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {product.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Marca:</span>
                          <p className="font-medium text-foreground">
                            {product.marca}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tipo:</span>
                          <p className="font-medium text-foreground">
                            {product.tipo}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Preço Base:
                          </span>
                          <p className="font-semibold text-foreground">
                            R${" "}
                            {product.preco_base.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Valor Carcaça:
                          </span>
                          <p className="font-medium text-foreground">
                            R${" "}
                            {(product.carcass_value || 0).toLocaleString(
                              "pt-BR",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </p>
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
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              )}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] px-3 py-4 text-sm font-medium">
                      Código
                    </TableHead>
                    <TableHead className="w-[250px] px-3 py-4 text-sm font-medium">
                      Produto
                    </TableHead>
                    <TableHead className="w-[100px] px-3 py-4 text-sm font-medium">
                      Cód. Fabr.
                    </TableHead>
                    <TableHead className="w-[110px] px-3 py-4 text-sm font-medium">
                      Marca
                    </TableHead>
                    <TableHead className="w-[90px] px-3 py-4 text-sm font-medium">
                      Tipo
                    </TableHead>
                    <TableHead className="w-[100px] px-3 py-4 text-sm font-medium">
                      Categoria
                    </TableHead>
                    <TableHead className="w-[110px] px-3 py-4 text-sm font-medium">
                      Preço
                    </TableHead>
                    <TableHead className="w-[90px] px-3 py-4 text-sm font-medium">
                      Valor Carcaça
                    </TableHead>
                    <TableHead className="w-[85px] px-3 py-4 text-sm font-medium">
                      Status
                    </TableHead>
                    <TableHead className="w-[60px] px-3 py-4 text-sm font-medium">
                      Obs.
                    </TableHead>
                    <TableHead className="w-[100px] px-3 py-4 text-sm font-medium">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="px-3 py-4 text-sm font-medium">
                        {product.codigo || "-"}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-sm font-medium">
                        <div className="line-clamp-2 wrap-break-word">
                          {product.nome}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-sm">
                        {product.codigo_fabricante || "-"}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-sm">
                        {product.marca}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-sm">
                        {product.tipo}
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(product.categoria)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-sm font-medium">
                        R${" "}
                        {product.preco_base.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="px-3 py-4 text-sm">
                        R${" "}
                        {(product.carcass_value || 0).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        <Badge
                          variant={product.ativo ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {product.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        {product.observacoes ? (
                          <div className="relative inline-block group">
                            <AlertCircle className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                              <div className="bg-popover text-popover-foreground text-sm rounded-md border border-border shadow-lg p-3 max-w-xs whitespace-normal wrap-break-word">
                                {product.observacoes}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(product)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {productUsageMap[product.id] ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleActive(product)}
                              title="Produto usado em pedidos - apenas inativar"
                              className="h-8 px-2 text-xs"
                            >
                              {product.ativo ? "Inativar" : "Ativar"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive h-8 w-8 p-0"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
