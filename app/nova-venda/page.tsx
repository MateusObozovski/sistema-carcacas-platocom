"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/lib/auth-context";
import {
  getClients,
  generateOrderNumber,
  getProducts,
  createOrder,
  getVendedorById,
  type DatabaseProduct,
} from "@/lib/supabase/database";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductSelectorModal } from "@/components/product-selector-modal";
import type { OrderItem } from "@/lib/types";
import { Plus, Trash2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NovaVendaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [clienteId, setClienteId] = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const clienteDropdownRef = useRef<HTMLDivElement>(null);

  const [vendedorNome, setVendedorNome] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [numeroPedidoOrigem, setNumeroPedidoOrigem] = useState("");
  const [empresa, setEmpresa] = useState<
    "Platocom" | "R.D.C" | "Rita de Cássia" | "Tork" | "Thiago" | "none"
  >("none");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(
    null
  );

  const [produtos, setProdutos] = useState<DatabaseProduct[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [items, setItems] = useState<OrderItem[]>([]);

  // Autocomplete de Clientes
  const clientesFiltrados = useMemo(() => {
    if (!clienteSearch.trim()) return clientes;
    const searchLower = clienteSearch.toLowerCase();
    return clientes.filter((cliente) =>
      cliente.nome.toLowerCase().includes(searchLower)
    );
  }, [clientes, clienteSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        clienteInputRef.current &&
        clienteDropdownRef.current &&
        !clienteInputRef.current.contains(event.target as Node) &&
        !clienteDropdownRef.current.contains(event.target as Node)
      ) {
        setShowClienteDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [productsData, clientsData] = await Promise.all([
          getProducts(),
          // Admin, Gerente e Coordenador veem todos os clientes ativos
          // Vendedor vê apenas seus clientes
          user?.role === "Vendedor" ? getClients(user.id) : getClients(),
        ]);
        setProdutos(productsData);
        setClientes(clientsData);
      } catch (error) {
        console.error("[v0] Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Cálculos em tempo real
  const totalOriginal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.precoOriginal * item.quantidade,
        0
      ),
    [items]
  );

  const totalDesconto = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + (item.precoOriginal - item.precoUnitario) * item.quantidade,
        0
      ),
    [items]
  );

  const totalFinal = useMemo(
    () => items.reduce((sum, item) => sum + item.subtotal, 0),
    [items]
  );

  const totalDebitoCarcaca = useMemo(
    () => items.reduce((sum, item) => sum + item.debitoCarcaca, 0),
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

    // Calcular preços
    const precoOriginal = produto.preco_base;
    const desconto = Math.min(produto.desconto_maximo_bt, 15);
    const valorDesconto = (precoOriginal * desconto) / 100;
    const precoUnitario = precoOriginal - valorDesconto;
    const quantidade = 1;
    const subtotal = precoUnitario * quantidade;
    const debitoCarcaca = quantidade;

    const newItem: OrderItem = {
      id: `item-${Date.now()}`,
      produtoId: produto.id,
      produtoNome: produto.nome,
      quantidade,
      precoUnitario,
      precoOriginal,
      desconto,
      subtotal,
      debitoCarcaca,
    };

    setItems([...items, newItem]);
    toast({
      title: "Item adicionado",
      description: `${produto.nome} adicionado ao pedido`,
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const atualizarQuantidade = (itemId: string, novaQuantidade: number) => {
    if (novaQuantidade < 1) return;
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const subtotal = item.precoUnitario * novaQuantidade;
          const debitoCarcaca = novaQuantidade;
          return {
            ...item,
            quantidade: novaQuantidade,
            subtotal,
            debitoCarcaca,
          };
        }
        return item;
      })
    );
  };

  const atualizarDesconto = (itemId: string, novoDesconto: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Validar desconto máximo do produto
    const produto = produtos.find((p) => p.id === item.produtoId);
    const descontoMaximo = produto?.desconto_maximo_bt || 15;
    const descontoFinal = Math.min(Math.max(novoDesconto, 0), descontoMaximo);

    const valorDesconto = (item.precoOriginal * descontoFinal) / 100;
    const precoUnitario = item.precoOriginal - valorDesconto;
    const subtotal = precoUnitario * item.quantidade;

    setItems(
      items.map((i) =>
        i.id === itemId
          ? { ...i, desconto: descontoFinal, precoUnitario, subtotal }
          : i
      )
    );
  };

  const handleSelectCliente = async (clienteId: string) => {
    setClienteId(clienteId);
    const cliente = clientes.find((c) => c.id === clienteId);
    if (cliente) {
      setClienteSearch(cliente.nome);

      // Buscar o vendedor do cliente
      if (cliente.vendedor_id) {
        try {
          const vendedor = await getVendedorById(cliente.vendedor_id);
          setVendedorNome(vendedor?.nome || "Não informado");
        } catch (error) {
          console.error("[v0] Error loading vendedor:", error);
          setVendedorNome("Não informado");
        }
      } else {
        setVendedorNome("Não informado");
      }
    }
    setShowClienteDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const numeroPedidoOrigemTrimmed = numeroPedidoOrigem.trim();

    // Buscar o vendedor_id do cliente selecionado
    const cliente = clientes.find((c) => c.id === clienteId);
    const vendedorResponsavel = cliente?.vendedor_id;

    if (!clienteId || items.length === 0 || !vendedorResponsavel || !numeroPedidoOrigemTrimmed) {
      toast({
        title: "Erro",
        description:
          !numeroPedidoOrigemTrimmed
            ? "Informe o número do pedido origem"
            : items.length === 0
            ? "Adicione pelo menos um item"
            : !clienteId
            ? "Selecione um cliente"
            : "Cliente não possui vendedor vinculado",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const numeroPedido = await generateOrderNumber();

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
        numero_pedido_origem: numeroPedidoOrigemTrimmed,
        empresa: empresa && empresa !== "none" ? empresa : undefined,
      };

      const orderItems = items.map((item) => ({
        produto_id: item.produtoId,
        produto_nome: item.produtoNome,
        quantidade: item.quantidade,
        preco_unitario: item.precoUnitario,
        desconto_percentual: item.desconto,
        preco_final: item.precoUnitario,
        debito_carcaca: item.debitoCarcaca,
        tipo_venda: "Base de Troca",
      }));

      await createOrder(order, orderItems);

      toast({
        title: "Venda registrada!",
        description: `Pedido ${numeroPedido} criado com sucesso`,
      });

      setTimeout(() => {
        router.push(`/pedidos/${numeroPedido}`);
      }, 1000);
    } catch (error) {
      console.error("[v0] Error creating order:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a venda",
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
    <ProtectedRoute>
      <div className="flex flex-col h-[calc(100vh-4rem-2rem)] bg-background overflow-hidden -m-4 md:-m-6 lg:-m-8">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col h-full overflow-hidden"
        >
          {/* 1. CABEÇALHO - Compacto e Horizontal */}
          <div className="border-b bg-muted/30 px-6 py-5 shrink-0">
            <div className="grid grid-cols-4 gap-4">
              {/* Cliente - Autocomplete */}
              <div className="space-y-2 relative">
                <Label htmlFor="cliente" className="text-base font-medium">
                  Cliente *
                </Label>
                <div className="relative" ref={clienteInputRef}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cliente"
                    placeholder="Buscar cliente..."
                    value={clienteSearch}
                    onChange={(e) => {
                      setClienteSearch(e.target.value);
                      setShowClienteDropdown(true);
                      if (!e.target.value) {
                        setClienteId("");
                        setVendedorNome("");
                      }
                    }}
                    onFocus={() => setShowClienteDropdown(true)}
                    required
                    className="pl-9 h-11 text-base"
                  />
                  {clienteId && (
                    <button
                      type="button"
                      onClick={() => {
                        setClienteId("");
                        setClienteSearch("");
                        setVendedorNome("");
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                {showClienteDropdown && clientesFiltrados.length > 0 && (
                  <div
                    ref={clienteDropdownRef}
                    className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
                  >
                    {clientesFiltrados.map((cliente) => (
                      <div
                        key={cliente.id}
                        onClick={() => handleSelectCliente(cliente.id)}
                        className="px-4 py-3 hover:bg-accent cursor-pointer text-base"
                      >
                        {cliente.nome}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vendedor - Somente Leitura */}
              <div className="space-y-2">
                <Label htmlFor="vendedor" className="text-base font-medium">
                  Vendedor
                </Label>
                <Input
                  id="vendedor"
                  value={
                    clienteId
                      ? vendedorNome || "Carregando..."
                      : "Selecione um cliente"
                  }
                  disabled
                  className="h-11 text-base bg-muted"
                />
              </div>

              {/* Número Pedido Origem */}
              <div className="space-y-2">
                <Label
                  htmlFor="numeroPedidoOrigem"
                  className="text-base font-medium"
                >
                  Nº Pedido Origem *
                </Label>
                <Input
                  id="numeroPedidoOrigem"
                  placeholder="Ex: PED-12345"
                  value={numeroPedidoOrigem}
                  onChange={(e) => setNumeroPedidoOrigem(e.target.value)}
                  required
                  className="h-11 text-base"
                />
              </div>

              {/* Empresa */}
              <div className="space-y-2">
                <Label htmlFor="empresa" className="text-base font-medium">
                  Empresa
                </Label>
                <Select
                  value={empresa || "none"}
                  onValueChange={(v) =>
                    setEmpresa(v === "none" ? "none" : (v as any))
                  }
                >
                  <SelectTrigger id="empresa" className="h-11 text-base">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="Platocom">Platocom</SelectItem>
                    <SelectItem value="R.D.C">R.D.C</SelectItem>
                    <SelectItem value="Rita de Cássia">
                      Rita de Cássia
                    </SelectItem>
                    <SelectItem value="Tork">Tork</SelectItem>
                    <SelectItem value="Thiago">Thiago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 2. CORPO: Tabela de Itens */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Botão Adicionar Produto */}
            <div className="px-6 py-4 border-b bg-background shrink-0">
              <Button
                type="button"
                onClick={() => setIsProductModalOpen(true)}
                className="h-11 text-base"
              >
                <Plus className="mr-2 h-5 w-5" />
                Adicionar Produto
              </Button>
            </div>

            {/* Tabela com scroll apenas nesta área */}
            <div className="flex-1 overflow-y-auto px-6 min-h-0">
              {items.length > 0 ? (
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10 border-b">
                    <TableRow>
                      <TableHead className="w-[300px] text-base font-semibold">
                        Item/Descrição
                      </TableHead>
                      <TableHead className="w-[100px] text-base font-semibold">
                        Qtd
                      </TableHead>
                      <TableHead className="w-[120px] text-base font-semibold">
                        Vl. Unit.
                      </TableHead>
                      <TableHead className="w-[100px] text-base font-semibold">
                        Desc %
                      </TableHead>
                      <TableHead className="w-[120px] text-base font-semibold">
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
                        <TableCell className="font-medium text-base">
                          {item.produtoNome}
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
                            className="w-20 h-10 text-base"
                          />
                        </TableCell>
                        <TableCell className="text-base">
                          {formatCurrency(item.precoUnitario)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={
                              produtos.find((p) => p.id === item.produtoId)
                                ?.desconto_maximo_bt || 15
                            }
                            step="0.1"
                            value={item.desconto}
                            onChange={(e) =>
                              atualizarDesconto(
                                item.id,
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-20 h-10 text-base"
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
          <div className="border-t bg-muted/30 px-6 py-4 shrink-0">
            <div className="flex gap-6">
              {/* Esquerda - Observações (60%) */}
              <div style={{ width: "60%" }}>
                <Label
                  htmlFor="observacoes"
                  className="text-base font-medium mb-2 block"
                >
                  Observações
                </Label>
                <Textarea
                  id="observacoes"
                  placeholder="Informações adicionais sobre o pedido..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className="resize-none text-base"
                />
              </div>

              {/* Direita - Totais e Botão (40%) */}
              <div
                className="flex flex-col justify-between"
                style={{ width: "40%" }}
              >
                <div className="space-y-3 text-right">
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">Total Bruto:</span>
                    <span className="font-medium">
                      {formatCurrency(totalOriginal)}
                    </span>
                  </div>
                  {totalDesconto > 0 && (
                    <div className="flex justify-between text-base">
                      <span className="text-green-600">Descontos:</span>
                      <span className="font-medium text-green-600">
                        - {formatCurrency(totalDesconto)}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-3 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">
                        TOTAL LÍQUIDO:
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(totalFinal)}
                      </span>
                    </div>
                  </div>
                  {totalDebitoCarcaca > 0 && (
                    <div className="flex justify-between text-sm text-orange-500 pt-1">
                      <span>Carcaças Pendentes:</span>
                      <span>{totalDebitoCarcaca} carcaça(s)</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !clienteId ||
                      items.length === 0 ||
                      !numeroPedidoOrigem.trim()
                    }
                    className="bg-orange-500 hover:bg-orange-600 text-white h-12 px-10 text-base font-semibold"
                  >
                    {isSubmitting ? "Processando..." : "Salvar Venda"}
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
