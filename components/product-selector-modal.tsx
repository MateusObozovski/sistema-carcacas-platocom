"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package } from "lucide-react";
import type { DatabaseProduct } from "@/lib/supabase/database";
import { PRODUCT_MARCAS } from "@/lib/types";

interface ProductSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: DatabaseProduct[];
  onSelectProduct: (product: DatabaseProduct) => void;
}

export function ProductSelectorModal({
  open,
  onOpenChange,
  products,
  onSelectProduct,
}: ProductSelectorModalProps) {
  const [searchText, setSearchText] = useState("");
  const [filterMarca, setFilterMarca] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");

  // Usar lista fixa de marcas
  const marcas = PRODUCT_MARCAS;
  const tipos = useMemo(
    () => Array.from(new Set(products.map((p) => p.tipo))).sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchText === "" ||
        product.nome.toLowerCase().includes(searchText.toLowerCase()) ||
        product.marca.toLowerCase().includes(searchText.toLowerCase());
      const matchesMarca =
        filterMarca === "all" || product.marca === filterMarca;
      const matchesTipo = filterTipo === "all" || product.tipo === filterTipo;
      const matchesCategoria =
        filterCategoria === "all" || product.categoria === filterCategoria;

      return matchesSearch && matchesMarca && matchesTipo && matchesCategoria;
    });
  }, [products, searchText, filterMarca, filterTipo, filterCategoria]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSelectProduct = (product: DatabaseProduct) => {
    onSelectProduct(product);
    onOpenChange(false);
    // Reset filters
    setSearchText("");
    setFilterMarca("all");
    setFilterTipo("all");
    setFilterCategoria("all");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selecionar Produto
          </DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="search">Buscar por Nome</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Digite o nome do produto..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Marca</Label>
            <Select value={filterMarca} onValueChange={setFilterMarca}>
              <SelectTrigger>
                <SelectValue />
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

        {/* Grid de Produtos */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 p-1">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectProduct(product)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">
                          {product.nome}
                        </h4>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{product.marca}</span>
                          <span>•</span>
                          <span>{product.tipo}</span>
                          <span>•</span>
                          <span className="capitalize">
                            {product.categoria}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-sm font-medium">
                            {formatCurrency(product.preco_base)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Desc. máx: {product.desconto_maximo_bt}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredProducts.length} produto(s) encontrado(s)
        </div>
      </DialogContent>
    </Dialog>
  );
}
