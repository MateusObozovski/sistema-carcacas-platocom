"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/lib/auth-context";
import {
  getSuppliers,
  getProducts,
  createPurchaseInvoice,
  type DatabaseSupplier,
  type DatabaseProduct,
} from "@/lib/supabase/database";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductSelectorModal } from "@/components/product-selector-modal";
import { Plus, Trash2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCurrencyInput,
  parseCurrencyInput,
  maskCurrencyInput,
} from "@/lib/masks";

interface ItemNota {
  id: string;
  produtoId?: string;
  produtoNome: string;
  produtoCodigo?: string;
  produtoCodigoFabricante?: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
}

export default function NovaNotaCompraPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [fornecedorId, setFornecedorId] = useState("");
  const [fornecedorSearch, setFornecedorSearch] = useState("");
  const [showFornecedorDropdown, setShowFornecedorDropdown] = useState(false);
  const fornecedorInputRef = useRef<HTMLInputElement>(null);
  const fornecedorDropdownRef = useRef<HTMLDivElement>(null);

  const [numeroNota, setNumeroNota] = useState("");
  const [dataNota, setDataNota] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dataVencimento, setDataVencimento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(
    null
  );

  // Estado para valores formatados dos preços
  const [valorUnitarioFormatado, setValorUnitarioFormatado] = useState<
    Record<string, string>
  >({});

  const [produtos, setProdutos] = useState<DatabaseProduct[]>([]);
  const [fornecedores, setFornecedores] = useState<DatabaseSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [items, setItems] = useState<ItemNota[]>([]);

  // Autocomplete de Fornecedores
  const fornecedoresFiltrados = useMemo(() => {
    if (!fornecedorSearch.trim()) return fornecedores;
    const searchLower = fornecedorSearch.toLowerCase();
    return fornecedores.filter((fornecedor) =>
      fornecedor.nome.toLowerCase().includes(searchLower)
    );
  }, [fornecedores, fornecedorSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        fornecedorInputRef.current &&
        fornecedorDropdownRef.current &&
        !fornecedorInputRef.current.contains(event.target as Node) &&
        !fornecedorDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFornecedorDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [productsData, suppliersData] = await Promise.all([
          getProducts(),
          getSuppliers(),
        ]);
        setProdutos(productsData);
        setFornecedores(suppliersData);
      } catch (error) {
        console.error("[v0] Error loading data:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // Cálculo do total
  const totalFinal = useMemo(
    () => items.reduce((sum, item) => sum + item.subtotal, 0),
    [items]
  );

  const handleSelectProduct = (produto: DatabaseProduct) => {
    // Verificar duplicidade
    const existingItem = items.find((item) => item.produtoId === produto.id);
    if (existingItem) {
      toast({
        title: "Produto já adicionado",
        description: `${produto.nome} já está na lista de itens`,
        variant: "destructive",
      });

      // Highlight da linha existente
      setHighlightedItemId(existingItem.id);
      setTimeout(() => setHighlightedItemId(null), 2000);
      return;
    }

    const valorUnitario = produto.preco_base;
    const quantidade = 1;
    const subtotal = valorUnitario * quantidade;

    const newItem: ItemNota = {
      id: `item-${Date.now()}`,
      produtoId: produto.id,
      produtoNome: produto.nome,
      produtoCodigo: produto.codigo,
      produtoCodigoFabricante: produto.codigo_fabricante,
      quantidade,
      valorUnitario,
      subtotal,
    };

    setItems([...items, newItem]);

    // Inicializar o valor formatado
    setValorUnitarioFormatado((prev) => ({
      ...prev,
      [newItem.id]: formatCurrencyInput(valorUnitario),
    }));

    toast({
      title: "Item adicionado",
      description: `${produto.nome} adicionado à nota`,
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
    // Remover também o valor formatado
    setValorUnitarioFormatado((prev) => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  };

  const atualizarQuantidade = (itemId: string, novaQuantidade: number) => {
    if (novaQuantidade < 1) return;
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const subtotal = item.valorUnitario * novaQuantidade;
          return {
            ...item,
            quantidade: novaQuantidade,
            subtotal,
          };
        }
        return item;
      })
    );
  };

  const atualizarValorUnitario = (itemId: string, valorFormatado: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Atualizar o valor formatado no estado
    setValorUnitarioFormatado((prev) => ({
      ...prev,
      [itemId]: valorFormatado,
    }));

    // Converter o valor formatado para número
    const novoValor = parseCurrencyInput(valorFormatado);

    // Se o valor for inválido ou zero, apenas atualizar a formatação sem recalcular
    if (isNaN(novoValor) || novoValor < 0) {
      return;
    }

    // Recalcular subtotal
    const subtotal = novoValor * item.quantidade;

    setItems(
      items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              valorUnitario: novoValor,
              subtotal,
            }
          : i
      )
    );
  };

  const handleSelectFornecedor = (fornecedorId: string) => {
    setFornecedorId(fornecedorId);
    const fornecedor = fornecedores.find((f) => f.id === fornecedorId);
    if (fornecedor) {
      setFornecedorSearch(fornecedor.nome);
    }
    setShowFornecedorDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (
      !fornecedorId ||
      !numeroNota.trim() ||
      !dataNota ||
      !dataVencimento ||
      items.length === 0
    ) {
      toast({
        title: "Erro",
        description: !numeroNota.trim()
          ? "Informe o número da nota"
          : !dataNota
          ? "Informe a data da nota"
          : !dataVencimento
          ? "Informe a data de vencimento"
          : items.length === 0
          ? "Adicione pelo menos um item"
          : "Selecione um fornecedor",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const invoiceData = {
        supplier_id: fornecedorId,
        numero_nota: numeroNota.trim(),
        data_nota: new Date(dataNota).toISOString(),
        data_vencimento: new Date(dataVencimento).toISOString(),
        valor_total: totalFinal,
        status: "Pendente",
        observacoes: observacoes.trim() || undefined,
        created_by: user!.id,
      };

      const invoiceItems = items.map((item) => ({
        produto_id: item.produtoId || undefined,
        descricao: item.produtoNome,
        quantidade: item.quantidade,
        valor_unitario: item.valorUnitario,
        valor_total: item.subtotal,
      }));

      await createPurchaseInvoice(invoiceData, invoiceItems);

      toast({
        title: "Nota cadastrada!",
        description: `Nota ${numeroNota} criada com sucesso`,
      });

      setTimeout(() => {
        router.push("/notas-compra");
      }, 1000);
    } catch (error: any) {
      console.error("[v0] Error creating invoice:", error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível cadastrar a nota",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <ProtectedRoute allowedRoles={["Coordenador", "Gerente", "admin"]}>
      <div className="flex flex-col min-h-[calc(100vh-4rem-2rem)] md:h-[calc(100vh-4rem-2rem)] bg-background md:overflow-hidden -m-4 md:-m-6 lg:-m-8">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:h-full md:overflow-hidden"
        >
          {/* 1. CABEÇALHO - Compacto e Horizontal */}
          <div className="border-b bg-muted/30 px-4 md:px-6 py-4 md:py-5 shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Fornecedor - Autocomplete */}
              <div className="space-y-2 relative">
                <Label htmlFor="fornecedor" className="text-base font-medium">
                  Fornecedor *
                </Label>
                <div className="relative" ref={fornecedorInputRef}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fornecedor"
                    placeholder="Buscar fornecedor..."
                    value={fornecedorSearch}
                    onChange={(e) => {
                      setFornecedorSearch(e.target.value);
                      setShowFornecedorDropdown(true);
                      if (!e.target.value) {
                        setFornecedorId("");
                      }
                    }}
                    onFocus={() => setShowFornecedorDropdown(true)}
                    required
                    className="pl-9 h-11 text-base"
                  />
                  {fornecedorId && (
                    <button
                      type="button"
                      onClick={() => {
                        setFornecedorId("");
                        setFornecedorSearch("");
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                {showFornecedorDropdown && fornecedoresFiltrados.length > 0 && (
                  <div
                    ref={fornecedorDropdownRef}
                    className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
                  >
                    {fornecedoresFiltrados.map((fornecedor) => (
                      <div
                        key={fornecedor.id}
                        onClick={() => handleSelectFornecedor(fornecedor.id)}
                        className="px-4 py-3 hover:bg-accent cursor-pointer text-base"
                      >
                        {fornecedor.nome}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Número da Nota */}
              <div className="space-y-2">
                <Label htmlFor="numeroNota" className="text-base font-medium">
                  Nº da Nota *
                </Label>
                <Input
                  id="numeroNota"
                  placeholder="Ex: 12345"
                  value={numeroNota}
                  onChange={(e) => setNumeroNota(e.target.value)}
                  required
                  className="h-11 text-base"
                />
              </div>

              {/* Data da Nota */}
              <div className="space-y-2">
                <Label htmlFor="dataNota" className="text-base font-medium">
                  Data da Nota *
                </Label>
                <Input
                  id="dataNota"
                  type="date"
                  value={dataNota}
                  onChange={(e) => setDataNota(e.target.value)}
                  required
                  className="h-11 text-base"
                />
              </div>

              {/* Data de Vencimento */}
              <div className="space-y-2">
                <Label
                  htmlFor="dataVencimento"
                  className="text-base font-medium"
                >
                  Data Vencimento *
                </Label>
                <Input
                  id="dataVencimento"
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  required
                  className="h-11 text-base"
                />
              </div>
            </div>
          </div>

          {/* 2. CORPO: Tabela de Itens */}
          <div className="flex-1 flex flex-col md:min-h-0 md:overflow-hidden">
            {/* Botão Adicionar Produto */}
            <div className="px-4 md:px-6 py-4 border-b bg-background shrink-0">
              <Button
                type="button"
                onClick={() => setIsProductModalOpen(true)}
                className="w-full md:w-auto h-11 text-base"
              >
                <Plus className="mr-2 h-5 w-5" />
                Adicionar Produto
              </Button>
            </div>

            {/* Tabela com scroll apenas nesta área (Desktop) / Fluxo normal (Mobile) */}
            <div className="md:flex-1 md:overflow-y-auto px-4 md:px-6 md:min-h-0">
              {items.length > 0 ? (
                <>
                  {/* Mobile View: Cards */}
                  <div className="md:hidden space-y-4 pb-4">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "bg-card rounded-lg border p-4 shadow-sm space-y-4",
                          highlightedItemId === item.id &&
                            "ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/10"
                        )}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                              {item.produtoCodigo || "-"}
                            </span>
                            <h4 className="font-medium text-base leading-tight">
                              {item.produtoNome}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Fab: {item.produtoCodigoFabricante || "-"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-8 w-8 text-destructive -mr-2 -mt-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Quantidade
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) =>
                                atualizarQuantidade(
                                  item.id,
                                  Number(e.target.value) || 1
                                )
                              }
                              className="h-10"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Valor Unit.
                            </Label>
                            <Input
                              type="text"
                              value={
                                valorUnitarioFormatado[item.id] !== undefined
                                  ? valorUnitarioFormatado[item.id]
                                  : formatCurrencyInput(item.valorUnitario)
                              }
                              onChange={(e) => {
                                const valorFormatado = maskCurrencyInput(
                                  e.target.value
                                );
                                atualizarValorUnitario(item.id, valorFormatado);
                              }}
                              onBlur={(e) => {
                                const valor = parseCurrencyInput(e.target.value);
                                if (valor >= 0) {
                                  setValorUnitarioFormatado((prev) => ({
                                    ...prev,
                                    [item.id]: formatCurrencyInput(valor),
                                  }));
                                }
                              }}
                              className="h-10"
                            />
                          </div>

                          <div className="space-y-1.5 col-span-2">
                            <Label className="text-xs text-muted-foreground">
                              Subtotal
                            </Label>
                            <div className="h-10 px-3 flex items-center bg-muted/50 rounded-md font-medium text-base">
                              {formatCurrency(item.subtotal)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Mobile Observations (Inside scroll area) */}
                    <div className="pt-4 border-t">
                      <Label
                        htmlFor="observacoes-mobile"
                        className="text-sm font-medium mb-2 block"
                      >
                        Observações
                      </Label>
                      <Textarea
                        id="observacoes-mobile"
                        placeholder="Informações adicionais..."
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                  </div>

                  {/* Desktop View: Table */}
                  <Table className="hidden md:table">
                    <TableHeader className="sticky top-0 bg-background z-10 border-b">
                      <TableRow>
                        <TableHead className="w-[100px] text-base font-semibold">
                          Código
                        </TableHead>
                        <TableHead className="w-[200px] text-base font-semibold">
                          Descrição
                        </TableHead>
                        <TableHead className="w-[120px] text-base font-semibold">
                          Cod. Fabricante
                        </TableHead>
                        <TableHead className="w-[80px] text-base font-semibold">
                          Qtd
                        </TableHead>
                        <TableHead className="w-[120px] text-base font-semibold">
                          Valor Unit.
                        </TableHead>
                        <TableHead className="w-[110px] text-base font-semibold">
                          Subtotal
                        </TableHead>
                        <TableHead className="w-[60px] text-base font-semibold">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow
                          key={item.id}
                          className={cn(
                            highlightedItemId === item.id &&
                              "bg-yellow-100 dark:bg-yellow-900/20 animate-pulse"
                          )}
                        >
                          <TableCell className="text-base">
                            {item.produtoCodigo || "-"}
                          </TableCell>
                          <TableCell className="font-medium text-base">
                            {item.produtoNome}
                          </TableCell>
                          <TableCell className="text-base">
                            {item.produtoCodigoFabricante || "-"}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) =>
                                atualizarQuantidade(
                                  item.id,
                                  Number(e.target.value) || 1
                                )
                              }
                              className="w-16 h-10 text-base"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              value={
                                valorUnitarioFormatado[item.id] !== undefined
                                  ? valorUnitarioFormatado[item.id]
                                  : formatCurrencyInput(item.valorUnitario)
                              }
                              onChange={(e) => {
                                const valorFormatado = maskCurrencyInput(
                                  e.target.value
                                );
                                atualizarValorUnitario(item.id, valorFormatado);
                              }}
                              onBlur={(e) => {
                                const valor = parseCurrencyInput(e.target.value);
                                if (valor >= 0) {
                                  setValorUnitarioFormatado((prev) => ({
                                    ...prev,
                                    [item.id]: formatCurrencyInput(valor),
                                  }));
                                }
                              }}
                              placeholder="0,00"
                              className="w-28 h-10 text-base"
                            />
                          </TableCell>
                          <TableCell className="font-medium text-base">
                            {formatCurrency(item.subtotal)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                              className="h-10 w-10 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <p className="text-lg mb-2">Nenhum item adicionado</p>
                    <p className="text-base">
                      Clique em "Adicionar Produto" para começar
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. RODAPÉ - Fixo na parte inferior */}
          <div className="border-t bg-muted/30 px-4 md:px-6 py-4 shrink-0 sticky bottom-0 md:static z-20">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              {/* Esquerda - Observações (Desktop Only) */}
              <div className="hidden md:block md:w-[60%]">
                <Label
                  htmlFor="observacoes"
                  className="text-base font-medium mb-2 block"
                >
                  Observações
                </Label>
                <Textarea
                  id="observacoes"
                  placeholder="Informações adicionais sobre a nota..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className="resize-none text-base"
                />
              </div>

              {/* Direita - Totais e Botão */}
              <div className="flex flex-col justify-between w-full md:w-[40%]">
                <div className="space-y-2 md:space-y-3 text-right">
                  <div className="border-t pt-2 md:pt-3 mt-1 md:mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg md:text-lg font-semibold">
                        TOTAL DA NOTA:
                      </span>
                      <span className="text-xl md:text-2xl font-bold text-primary">
                        {formatCurrency(totalFinal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !fornecedorId ||
                      items.length === 0 ||
                      !numeroNota.trim() ||
                      !dataNota ||
                      !dataVencimento
                    }
                    className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white h-12 md:px-10 text-base font-semibold"
                  >
                    {isSubmitting ? "Processando..." : "Salvar Nota"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Modal de Seleção de Produtos */}
        <ProductSelectorModal
          open={isProductModalOpen}
          onOpenChange={setIsProductModalOpen}
          products={produtos}
          onSelectProduct={handleSelectProduct}
        />
      </div>
    </ProtectedRoute>
  );
}
