"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
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

import { Search, Package, ChevronLeft, ChevronRight, Info } from "lucide-react";
import type { DatabaseProduct } from "@/lib/supabase/database";


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
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [filterMarca, setFilterMarca] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Application details modal state
  const [applicationModalOpen, setApplicationModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<{title: string, content: string} | null>(null);

  // Debounce search text para evitar filtragem excessiva
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchText, filterMarca, filterTipo, filterCategoria]);

  // Extrair valores distintos dos produtos para filtros dinâmicos
  const marcas = useMemo(
    () => Array.from(new Set(products.map((p) => p.marca))).filter(Boolean).sort(),
    [products]
  );
  
  const tipos = useMemo(
    () => Array.from(new Set(products.map((p) => p.tipo))).filter(Boolean).sort(),
    [products]
  );

  const categorias = useMemo(
    () => Array.from(new Set(products.map((p) => p.categoria))).filter(Boolean).sort(),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const searchInput = debouncedSearchText.trim().toLowerCase();
    
    // Split by * to get all required search terms
    const searchTerms = searchInput.split('*').filter(term => term.length > 0);

    return products.filter((product) => {
      // Create a combined string of all searchable fields
      const productSearchText = [
        product.nome,
        product.marca,
        product.codigo,
        product.codigo_fabricante,
        product.aplicacao,
        product.tipo,
        product.categoria,
        product.sigla_marca
      ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

      // Check if ALL search terms exist in the product text (AND logic)
      const matchesSearch = searchTerms.every(term => 
        productSearchText.includes(term)
      );

      const matchesMarca =
        filterMarca === "all" || product.marca === filterMarca;
      const matchesTipo = filterTipo === "all" || product.tipo === filterTipo;
      const matchesCategoria =
        filterCategoria === "all" || product.categoria === filterCategoria;

      return matchesSearch && matchesMarca && matchesTipo && matchesCategoria;
    });
  }, [products, debouncedSearchText, filterMarca, filterTipo, filterCategoria]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage]);

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
    setCurrentPage(1);
  };

  const handleOpenApplication = (e: React.MouseEvent, productName: string, application: string) => {
    e.stopPropagation(); // Prevent card click
    setSelectedApplication({ title: productName, content: application });
    setApplicationModalOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selecionar Produto
          </DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <div className="space-y-3 pb-2">
          {/* Linha 1: busca principal */}
          <div className="space-y-1.5">
            <Label htmlFor="search" className="text-sm font-medium hidden sm:block">
              Buscar produto (nome, marca, cód. fab. ou aplicação)
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Buscar (nome, marca, código...)"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          {/* Linha 2: filtros compactos */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Marca
              </Label>
              <Select value={filterMarca} onValueChange={setFilterMarca}>
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Todas" />
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

            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tipo
              </Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Todos" />
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

            <div className="space-y-1 col-span-2 md:col-span-1">
              <Label className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Categoria
              </Label>
              <Select
                value={filterCategoria}
                onValueChange={setFilterCategoria}
              >
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>
                      {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Grid de Produtos */}
        <div className="h-[60vh] overflow-y-auto -mx-6 px-6 border-t border-b">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 p-1">
            {paginatedProducts.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Nenhum produto encontrado
              </div>
            ) : (
              paginatedProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:bg-accent transition-colors border-muted/60"
                  onClick={() => handleSelectProduct(product)}
                >
                  <CardContent className="px-3 py-2.5">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm line-clamp-2 leading-snug">
                          {product.nome}
                        </h4>
                        {product.aplicacao && (
                          <div className="shrink-0">
                             <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground/70 hover:text-accent-foreground"
                              onClick={(e) => handleOpenApplication(e, product.nome, product.aplicacao!)}
                             >
                              <Info className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>

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
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between pt-2 border-t mt-2">
           <div className="text-sm text-muted-foreground">
             Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de {filteredProducts.length} produtos
           </div>
           <div className="flex items-center space-x-2">
             <Button
               variant="outline"
               size="sm"
               onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
               disabled={currentPage === 1}
             >
               <ChevronLeft className="h-4 w-4" />
               Anterior
             </Button>
             <div className="text-sm font-medium">
               Página {currentPage} de {Math.max(totalPages, 1)}
             </div>
             <Button
               variant="outline"
               size="sm"
               onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
               disabled={currentPage === totalPages || totalPages === 0}
             >
               Próxima
               <ChevronRight className="h-4 w-4" />
             </Button>
           </div>
        </div>

        {/* Application Details Modal */}
        <Dialog open={applicationModalOpen} onOpenChange={setApplicationModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Detalhes da Aplicação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">Produto</h4>
                <p className="font-medium leading-tight">{selectedApplication?.title}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-md border">
                <h4 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Aplicação / Compatibilidade
                </h4>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedApplication?.content}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
               <Button onClick={() => setApplicationModalOpen(false)}>
                 Fechar
               </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
