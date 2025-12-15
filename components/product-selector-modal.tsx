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
      const search = searchText.trim().toLowerCase();
      const matchesSearch =
        search === "" ||
        product.nome.toLowerCase().includes(search) ||
        product.marca.toLowerCase().includes(search) ||
        (product.codigo && product.codigo.toLowerCase().includes(search)) ||
        (product.codigo_fabricante &&
          product.codigo_fabricante.toLowerCase().includes(search));
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
        <div className="space-y-3">
          {/* Linha 1: busca principal */}
          <div className="space-y-1.5">
            <Label htmlFor="search" className="text-sm font-medium">
              Buscar produto (nome, marca, código ou código do fabricante)
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Pesquise por nome, marca, código ou código do fabricante"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Linha 2: filtros compactos */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Marca
              </Label>
              <Select value={filterMarca} onValueChange={setFilterMarca}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todas as marcas" />
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

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Tipo
              </Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todos os tipos" />
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

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Categoria
              </Label>
              <Select
                value={filterCategoria}
                onValueChange={setFilterCategoria}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todas as categorias" />
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
        </div>

        {/* Grid de Produtos */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 p-1">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:bg-accent transition-colors border-muted/60"
                    onClick={() => handleSelectProduct(product)}
                  >
                    <CardContent className="px-3 py-2.5">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm line-clamp-2 leading-snug">
                          {product.nome}
                        </h4>

                        {/* Códigos */}
                        <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                          {product.codigo && (
                            <span className="px-1 py-0.5 rounded bg-muted text-foreground/80">
                              Cód: {product.codigo}
                            </span>
                          )}
                          {product.codigo_fabricante && (
                            <span className="px-1 py-0.5 rounded bg-muted text-foreground/80">
                              Fab.: {product.codigo_fabricante}
                            </span>
                          )}
                        </div>

                        {/* Linha de meta-informações */}
                        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                          <span>{product.marca}</span>
                          <span>•</span>
                          <span>{product.tipo}</span>
                          <span>•</span>
                          <span className="capitalize">
                            {product.categoria}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1.5">
                          <span className="text-base font-semibold">
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
