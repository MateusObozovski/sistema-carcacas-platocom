"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Trash2, Package, CheckCircle, Upload, FileText, X, Filter, Camera } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PendingCarcassesPanel } from "@/components/pending-carcasses-panel";
import { ProductSelectorModal } from "@/components/product-selector-modal";
import {
  createMerchandiseEntry,
  getMerchandiseEntries,
  getMerchandiseEntriesWithLinks,
  getClients,
  getProducts,
  getPendingCarcacasByCliente,
  generateRelatorioEntradaNumber,
  type DatabaseMerchandiseEntry,
  type DatabaseProduct,
  type DatabaseClient,
  uploadEntryDocuments,
  getEntryDocuments,
  type DatabaseEntryDocument,
} from "@/lib/supabase/database";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isAuthError } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface EntryItem {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  orderItemId?: string;  // ID do order_item para vinculação automática
  pendingItemId?: string; // ID do item pendente (para controle de duplicatas por pedido)
}

export default function EntradaMercadoriaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<
    "todos" | "Pendente" | "Concluída"
  >("todos");
  const [entradas, setEntradas] = useState<DatabaseMerchandiseEntry[]>([]);
  const [entradasComLinks, setEntradasComLinks] = useState<any[]>([]);
  const [clientes, setClientes] = useState<DatabaseClient[]>([]);
  const [produtos, setProdutos] = useState<DatabaseProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRelatorios, setIsLoadingRelatorios] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [relatorioClienteFiltro, setRelatorioClienteFiltro] =
    useState<string>("todos");
  const [relatorioStatusFiltro, setRelatorioStatusFiltro] = useState<
    "todos" | "Pendente" | "Concluída"
  >("todos");
  
  // Novos filtros para Relatórios
  const [relatorioDataInicio, setRelatorioDataInicio] = useState("");
  const [relatorioDataFim, setRelatorioDataFim] = useState("");
  const [relatorioBuscaNota, setRelatorioBuscaNota] = useState("");
  const [relatorioBuscaRelatorio, setRelatorioBuscaRelatorio] = useState("");

  // Product selector modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [currentEditingItemIndex, setCurrentEditingItemIndex] = useState<number | null>(null);

  const [optionalInvoiceNumber, setOptionalInvoiceNumber] = useState("");

  const [formData, setFormData] = useState({
    cliente_id: "",
    numero_nota_fiscal: "", // Will store the Report Number
    items: [] as EntryItem[],
  });

  // Pending Carcasses State
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [isSidePanelLoading, setIsSidePanelLoading] = useState(false);

  // Handlers for Pending Carcasses
  const handleClientChange = async (clientId: string) => {
    setFormData({ ...formData, cliente_id: clientId });
    
    // Reset pending items when client changes
    setPendingItems([]);
    
    if (clientId) {
      setIsSidePanelLoading(true);
      try {
        const pendencias = await getPendingCarcacasByCliente(clientId);
        if (pendencias && pendencias.length > 0) {
          // Map to correct interface
          const mappedPendencias = pendencias.map((item: any) => ({
            id: item.id,
            produto_id: item.produto_id,
            produto_nome: item.produto_nome,
            quantidade_pendente: item.debito_carcaca,
            preco_unitario: item.preco_unitario,
            pedido_origem: item.orders?.numero_pedido,
            pedido_id: item.orders?.id,
            data_venda: item.orders?.data_venda,
          }));
          
          setPendingItems(mappedPendencias);
          setIsSidePanelOpen(true); // Open automatically if has pending items
          
          toast({
            title: "Pendências Encontradas",
            description: `Este cliente possui ${pendencias.length} itens pendentes de devolução.`,
          });
        }
      } catch (error) {
        console.error("Error fetching pending items:", error);
      } finally {
        setIsSidePanelLoading(false);
      }
    }
  };

  const handleSelectPendingItem = (item: any) => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          produtoId: item.produto_id,
          produtoNome: item.produto_nome,
          quantidade: item.quantidade_pendente || 1,
          orderItemId: item.id, // ID do order_item para vinculação automática
          pendingItemId: item.id, // ID único por pedido para controle de duplicatas
        }
      ]
    }));

    toast({
      title: "Item Adicionado",
      description: `${item.produto_nome} (Pedido #${item.orders?.numero_pedido}) adicionado com sucesso.`,
    });
  };

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Document Viewing State
  const [viewDocsOpen, setViewDocsOpen] = useState(false);
  const [currentDocs, setCurrentDocs] = useState<DatabaseEntryDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      // Timeout de segurança (30 segundos)
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.error("[v0] Timeout ao carregar entrada de mercadoria");
          setIsLoading(false);
          toast({
            title: "Erro",
            description:
              "O carregamento está demorando muito. Tente recarregar a página.",
            variant: "destructive",
          });
        }
      }, 30000);

      try {
        if (!user) {
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        setIsLoading(true);

        // Buscar entradas
        const entradasData = await getMerchandiseEntries(user.id, user.role);
        setEntradas(entradasData || []);

        // Buscar clientes
        const clientesData = await getClients();
        setClientes(clientesData || []);

        // Buscar produtos
        const produtosData = await getProducts();
        setProdutos(produtosData || []);
        
        // Generate initial report number - REMOVED per request
        // generateRelatorioEntradaNumber().then((numero) => {
        //   setFormData(prev => ({ ...prev, numero_nota_fiscal: numero }));
        // });
      } catch (error: any) {
        console.error("[v0] Error fetching data:", error);

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
            description: "Não foi possível carregar os dados. Tente novamente.",
            variant: "destructive",
          });
        }

        setEntradas([]);
        setClientes([]);
        setProdutos([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
        clearTimeout(timeoutId);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user, toast, router]);

  const loadRelatorios = async () => {
    try {
      setIsLoadingRelatorios(true);
      if (!user) return;

      const data = await getMerchandiseEntriesWithLinks(user.id, user.role);
      setEntradasComLinks(data || []);
    } catch (error) {
      console.error("[v0] Error loading relatorios:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os relatórios",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRelatorios(false);
    }
  };

  const handleViewDocuments = async (entryId: string) => {
    setCurrentEntryId(entryId);
    setViewDocsOpen(true);
    setIsLoadingDocs(true);
    try {
      const docs = await getEntryDocuments(entryId);
      setCurrentDocs(docs || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os documentos.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleAddItem = () => {
    setIsSidePanelOpen(true);
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handler for opening product selector modal
  const handleOpenProductSelector = (itemIndex: number) => {
    setCurrentEditingItemIndex(itemIndex);
    setIsProductModalOpen(true);
  };

  // Handler for selecting a product from the modal
  const handleSelectProduct = (product: DatabaseProduct) => {
    if (currentEditingItemIndex === null) return;

    // Check if product is already in the list
    const productExists = formData.items.some(
      (item, idx) => idx !== currentEditingItemIndex && item.produtoId === product.id
    );

    if (productExists) {
      toast({
        title: "Erro",
        description: "Este produto já foi adicionado. Cada item só pode aparecer uma vez.",
        variant: "destructive",
      });
      return;
    }

    // Update the item with selected product
    const newItems = [...formData.items];
    newItems[currentEditingItemIndex] = {
      produtoId: product.id,
      produtoNome: product.nome,
      quantidade: newItems[currentEditingItemIndex]?.quantidade || 1,
    };
    
    setFormData({ ...formData, items: newItems });
    setIsProductModalOpen(false);
    setCurrentEditingItemIndex(null);
  };

  const handleItemChange = (
    index: number,
    field: keyof EntryItem,
    value: string | number
  ) => {
    const newItems = [...formData.items];
    if (field === "produtoId") {
      // Verificar se o produto já está em outra linha
      const produtoJaExiste = newItems.some(
        (item, i) => i !== index && item.produtoId === value && value !== ""
      );

      if (produtoJaExiste) {
        toast({
          title: "Erro",
          description:
            "Este produto já foi adicionado. Cada item só pode aparecer uma vez.",
          variant: "destructive",
        });
        return;
      }

      const produto = produtos.find((p) => p.id === value);
      newItems[index] = {
        ...newItems[index],
        produtoId: value as string,
        produtoNome: produto?.nome || "",
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.cliente_id) {
        toast({
          title: "Erro",
          description: "Selecione um cliente",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (!formData.numero_nota_fiscal.trim()) {
        toast({
          title: "Erro",
          description: "O número do Relatório de Entrada é obrigatório.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (formData.items.length === 0) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos um item",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Validar itens
      const produtosIds = new Set<string>();
      for (const item of formData.items) {
        if (!item.produtoId) {
          toast({
            title: "Erro",
            description: "Todos os itens devem ter um produto selecionado",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        if (item.quantidade <= 0) {
          toast({
            title: "Erro",
            description: "A quantidade deve ser maior que zero",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        // Verificar se há produtos duplicados
        if (produtosIds.has(item.produtoId)) {
          toast({
            title: "Erro",
            description:
              "Não é possível ter o mesmo produto em linhas diferentes. Cada item só pode aparecer uma vez.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        produtosIds.add(item.produtoId);
      }

      let finalNotaFiscal = formData.numero_nota_fiscal.trim();
      if (optionalInvoiceNumber.trim()) {
        finalNotaFiscal = `${finalNotaFiscal} (NF: ${optionalInvoiceNumber.trim()})`;
      }



      const createdEntry = await createMerchandiseEntry(
        {
          cliente_id: formData.cliente_id,
          numero_nota_fiscal: finalNotaFiscal,
          data_nota: new Date().toISOString(), // Sempre usa a data de hoje
          status: "Pendente",
          created_by: user!.id,
        },
        formData.items.map((item) => ({
          produto_id: item.produtoId,
          produto_nome: item.produtoNome,
          quantidade: item.quantidade,
          order_item_id: item.orderItemId, // Para vinculação automática
        }))
      );

      // Upload Documents
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        try {
            await uploadEntryDocuments(createdEntry.id, selectedFiles);
            toast({
                title: "Documentos enviados",
                description: "Os documentos foram anexados com sucesso.",
            });
        } catch (uploadError) {
             console.error("Error uploading documents:", uploadError);
             toast({
                title: "Erro no envio de documentos",
                description: "A entrada foi criada, mas houve erro ao enviar alguns documentos.",
                variant: "destructive"
             });
        } finally {
            setIsUploading(false);
        }
      }

      toast({
        title: "Sucesso",
        description: "Entrada de mercadoria registrada com sucesso",
      });

      // Limpar formulário
      setFormData({
        cliente_id: "",
        numero_nota_fiscal: "",
        items: [],
      });
      setOptionalInvoiceNumber("");
      setSelectedFiles([]);
      setIsUploading(false);
      
      // Regenerate report number for next entry - REMOVED per request
      // generateRelatorioEntradaNumber().then((numero) => {
      //   setFormData(prev => ({ ...prev, numero_nota_fiscal: numero }));
      // });

      setShowAddForm(false);

      // Recarregar lista
      const entradasData = await getMerchandiseEntries(user!.id, user!.role);
      setEntradas(entradasData || []);

      // Upload de documentos (se houver)
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        toast({
            title: "Enviando documentos...",
            description: "Por favor aguarde enquanto os documentos são enviados.",
        });
        
        // entryData returns the created entry. We need to capture it.
        // The createMerchandiseEntry function returns entryData as the result of the promise if successful.
        // Wait, the current implementation of createMerchandiseEntry doesn't return the ID easily here because I didn't capture the result.
        // Let's refactor the call above to capture the result.
        // Actually, createMerchandiseEntry DOES return entryData. I just didn't assign it to a variable.
      }
    } catch (error: any) {
      console.error("[v0] Error creating merchandise entry:", error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível registrar a entrada",
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const entradasFiltradas = entradas.filter((entrada) => {
    const matchSearch =
      entrada.numero_nota_fiscal
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      entrada.clients?.nome?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus =
      statusFiltro === "todos" || entrada.status === statusFiltro;

    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <ProtectedRoute>
        <main className="p-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </main>
      </ProtectedRoute>
    );
  }

  const entradasRelatorioFiltradas = entradasComLinks.filter((entrada) => {
    const matchCliente =
      relatorioClienteFiltro === "todos" ||
      entrada.cliente_id === relatorioClienteFiltro;
    const matchStatus =
      relatorioStatusFiltro === "todos" ||
      entrada.status === relatorioStatusFiltro;

      
    // Filtro por Data
    let matchData = true;
    if (relatorioDataInicio || relatorioDataFim) {
        const dataEntrada = new Date(entrada.data_nota).setHours(0,0,0,0);
        if (relatorioDataInicio) {
            const dataInicio = new Date(relatorioDataInicio).setHours(0,0,0,0);
            if (dataEntrada < dataInicio) matchData = false;
        }
        if (relatorioDataFim) {
            const dataFim = new Date(relatorioDataFim).setHours(0,0,0,0);
            if (dataEntrada > dataFim) matchData = false;
        }
    }

    // Filtro por Número da Nota e Relatório
    // Ambos são armazenados em numero_nota_fiscal: "REL-YYYY-NNNN (NF: XXXXX)"
    let matchNota = true;
    let matchRelatorio = true;

    if (relatorioBuscaNota) {
         // O número da nota está geralmente dentro de (NF: ...), mas vamos buscar no string todo
         // para ser flexível, mas idealmente buscaríamos só na parte da nota.
         // Se o usuário digitar "123", deve achar.
         if (!entrada.numero_nota_fiscal.toLowerCase().includes(relatorioBuscaNota.toLowerCase())) {
             matchNota = false;
         }
    }

    if (relatorioBuscaRelatorio) {
        if (!entrada.numero_nota_fiscal.toLowerCase().includes(relatorioBuscaRelatorio.toLowerCase())) {
            matchRelatorio = false;
        }
    }

    return matchCliente && matchStatus && matchData && matchNota && matchRelatorio;
  });

  return (
    <ProtectedRoute>
      <PendingCarcassesPanel
        isOpen={isSidePanelOpen}
        onClose={() => setIsSidePanelOpen(false)}
        pendingItems={pendingItems}
        onSelectItem={handleSelectPendingItem}
        onSelectUnlinkedEntry={() => {
          // Adiciona um item vazio à lista e abre o modal de seleção
          const newIndex = formData.items.length;
          setFormData(prev => ({
            ...prev,
            items: [...prev.items, { produtoId: "", produtoNome: "", quantidade: 1 }]
          }));
          setCurrentEditingItemIndex(newIndex);
          setIsProductModalOpen(true);
          setIsSidePanelOpen(false);
        }}
        selectedPendingItemIds={formData.items.map(item => item.pendingItemId).filter(Boolean) as string[]}
        clientName={clientes.find((c) => c.id === formData.cliente_id)?.nome}
      />
      
      {/* Modal de seleção de produto para entrada sem vínculo */}
      <ProductSelectorModal
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        products={produtos}
        onSelectProduct={handleSelectProduct}
      />
      
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Entrada de Mercadoria</h1>
            <p className="text-muted-foreground">
              Registre as entradas de mercadoria recebidas
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nova Entrada
          </Button>
        </div>

        <Tabs defaultValue="entradas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="entradas">Entradas</TabsTrigger>
            <TabsTrigger value="relatorios" onClick={loadRelatorios}>
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entradas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="search">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Buscar por nota fiscal ou cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="w-full space-y-2 md:w-48">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={statusFiltro}
                      onValueChange={(value: any) => setStatusFiltro(value)}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Concluída">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entradas Registradas</CardTitle>
                <CardDescription>
                  {entradasFiltradas.length} entrada(s) encontrada(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {entradasFiltradas.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhuma entrada encontrada
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Relatório de Entrada</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Data da Nota</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data de Registro</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entradasFiltradas.map((entrada) => (
                          <TableRow key={entrada.id}>
                            <TableCell className="font-medium">
                              {entrada.numero_nota_fiscal}
                            </TableCell>
                            <TableCell>
                              {entrada.clients?.nome || "N/A"}
                            </TableCell>
                            <TableCell>{formatDate(entrada.data_nota)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  entrada.status === "Concluída"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {entrada.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(entrada.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                               <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDocuments(entrada.id)}
                                  title="Ver Anexos"
                               >
                                  <FileText className="h-4 w-4" />
                               </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relatorios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="relatorio-cliente">Cliente</Label>
                    <Select
                      value={relatorioClienteFiltro}
                      onValueChange={setRelatorioClienteFiltro}
                    >
                      <SelectTrigger id="relatorio-cliente">
                        <SelectValue placeholder="Todos os clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {clientes
                          .filter((c) => c.ativo)
                          .map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full space-y-2 md:w-48">
                    <Label htmlFor="relatorio-status">Status</Label>
                    <Select
                      value={relatorioStatusFiltro}
                      onValueChange={(value: any) =>
                        setRelatorioStatusFiltro(value)
                      }
                    >
                      <SelectTrigger id="relatorio-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Concluída">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                
                {/* Visual Improved Filters */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground">Filtros Avançados</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-4">
                       <div className="space-y-2">
                          <Label htmlFor="relatorio-data-inicio" className="text-xs font-semibold text-muted-foreground uppercase">Data Inicial</Label>
                          <Input
                              id="relatorio-data-inicio"
                              type="date"
                              value={relatorioDataInicio}
                              onChange={(e) => setRelatorioDataInicio(e.target.value)}
                              className="h-10"
                          />
                       </div>

                       <div className="space-y-2">
                          <Label htmlFor="relatorio-data-fim" className="text-xs font-semibold text-muted-foreground uppercase">Data Final</Label>
                          <Input
                              id="relatorio-data-fim"
                              type="date"
                              value={relatorioDataFim}
                              onChange={(e) => setRelatorioDataFim(e.target.value)}
                              className="h-10"
                          />
                       </div>

                       <div className="space-y-2">
                          <Label htmlFor="relatorio-busca-relatorio" className="text-xs font-semibold text-muted-foreground uppercase">Nº Relatório</Label>
                          <Input
                              id="relatorio-busca-relatorio"
                              placeholder="REL-..."
                              value={relatorioBuscaRelatorio}
                              onChange={(e) => setRelatorioBuscaRelatorio(e.target.value)}
                              className="h-10"
                          />
                       </div>

                       <div className="space-y-2">
                          <Label htmlFor="relatorio-busca-nota" className="text-xs font-semibold text-muted-foreground uppercase">Nº Nota Fiscal</Label>
                          <Input
                              id="relatorio-busca-nota"
                              placeholder="Digite o número..."
                              value={relatorioBuscaNota}
                              onChange={(e) => setRelatorioBuscaNota(e.target.value)}
                              className="h-10"
                          />
                       </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Relatório de Entradas e Vínculos</CardTitle>
                <CardDescription>
                  {entradasRelatorioFiltradas.length} entrada(s) encontrada(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRelatorios ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </div>
                ) : entradasRelatorioFiltradas.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhuma entrada encontrada
                  </div>
                ) : (
                  <div className="space-y-6">
                    {entradasRelatorioFiltradas.map((entrada) => (
                      <Card key={entrada.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="mb-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 space-y-2">
                              {/* Extract and display Report Number and Invoice Number separately */}
                              {(() => {
                                const notaFiscal = entrada.numero_nota_fiscal || "";
                                // Try to parse "REL-YYYY-NNNN (NF: XXXXX)" format
                                const relMatch = notaFiscal.match(/^(REL-[^\s(]+)/);
                                const nfMatch = notaFiscal.match(/\(NF:\s*([^)]+)\)/);
                                const relatorio = relMatch ? relMatch[1] : notaFiscal;
                                const notaNumero = nfMatch ? nfMatch[1] : null;
                                
                                return (
                                  <>
                                    <div className="flex items-center gap-3">
                                      <h3 className="text-lg font-bold text-foreground">
                                        {relatorio}
                                      </h3>
                                      <Badge
                                        variant={
                                          entrada.status === "Concluída"
                                            ? "default"
                                            : "secondary"
                                        }
                                        className="ml-auto"
                                      >
                                        {entrada.status}
                                      </Badge>
                                    </div>
                                    {notaNumero && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground uppercase">Nota Fiscal:</span>
                                        <span className="text-sm font-semibold text-foreground">{notaNumero}</span>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Package className="h-3.5 w-3.5" />
                                  {entrada.clients?.nome || "N/A"}
                                </span>
                                <span>•</span>
                                <span>{formatDate(entrada.data_nota)}</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDocuments(entrada.id)}
                              title="Ver Anexos"
                              className="ml-4"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Anexos
                            </Button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead>Qtd</TableHead>
                                <TableHead>Status Vínculo</TableHead>
                                <TableHead>Pedido Vinculado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {entrada.merchandise_entry_items?.map(
                                (item: any) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                      {item.produto_nome}
                                    </TableCell>
                                    <TableCell>{item.quantidade}</TableCell>
                                    <TableCell>
                                      {item.vinculado ? (
                                        <Badge variant="default">
                                          <CheckCircle className="mr-1 h-3 w-3" />
                                          Vinculado
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary">
                                          Pendente
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {item.vinculado && item.order_items ? (
                                        <div className="text-sm">
                                          <div className="font-medium">
                                            {item.order_items.orders
                                              ?.numero_pedido || "N/A"}
                                          </div>
                                          <div className="text-muted-foreground">
                                            {item.order_items.orders?.data_venda
                                              ? formatDate(
                                                  item.order_items.orders
                                                    .data_venda
                                                )
                                              : "-"}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog para Nova Entrada */}
        <Dialog
          open={showAddForm}
          onOpenChange={(open) => {
            setShowAddForm(open);
            if (!open) {
              // Reset form when closing
              setFormData({
                cliente_id: "",
                numero_nota_fiscal: "", // Keep it empty or regen? Regen is better but async.
                items: [],
              });
               setOptionalInvoiceNumber("");
               setSelectedFiles([]);
               setIsUploading(false);
              // Start regen - REMOVED per request
               // generateRelatorioEntradaNumber().then((numero) => {
               //    setFormData(prev => ({ ...prev, numero_nota_fiscal: numero }));
               // });
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Entrada de Mercadoria</DialogTitle>
              <DialogDescription>
                Preencha os dados da entrada de mercadoria recebida
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente *</Label>
                    <Select
                      value={formData.cliente_id}
                      onValueChange={handleClientChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="cliente">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes
                          .filter((c) => c.ativo)
                          .map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero_relatorio">
                       Número do Rel. de Entrada *
                    </Label>
                    <Input
                       id="numero_relatorio"
                       value={formData.numero_nota_fiscal}
                       onChange={(e) => setFormData({...formData, numero_nota_fiscal: e.target.value})}
                       placeholder="Digite o numero do Relatório de Entrada"
                       required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero_nota_opcional">
                       Número da Nota Fiscal (Opcional)
                    </Label>
                    <Input
                       id="numero_nota_opcional"
                       value={optionalInvoiceNumber}
                       onChange={(e) => setOptionalInvoiceNumber(e.target.value)}
                       placeholder="Digite o número da nota se houver"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="documentos">Anexar Documentos</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                            id="documentos"
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Input
                            id="camera-capture"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <Label
                            htmlFor="documentos"
                            className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Selecionar Arquivos
                        </Label>
                        <Label
                            htmlFor="camera-capture"
                            className="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm text-primary ring-offset-background hover:bg-primary/20"
                        >
                            <Camera className="mr-2 h-4 w-4" />
                            Tirar Foto
                        </Label>
                    </div>
                    {selectedFiles.length > 0 && (
                        <div className="mt-2 space-y-2">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between rounded-md border p-2 text-sm">
                                    <div className="flex items-center truncate">
                                        <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <span className="truncate max-w-[200px]">{file.name}</span>
                                        <span className="ml-2 text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveFile(index)}
                                        className="h-6 w-6"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Itens da Entrada *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Item
                    </Button>
                  </div>

                  {formData.items.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      Nenhum item adicionado. Clique em "Adicionar Item" para
                      começar.
                    </div>
                  ) : (
                    <div className="space-y-2">
                       {/* Product Selector Modal */}
                      <ProductSelectorModal
                        open={isProductModalOpen}
                        onOpenChange={setIsProductModalOpen}
                        products={produtos}
                        onSelectProduct={handleSelectProduct}
                      />
                      
                      {formData.items.map((item, index) => (
                        <Card key={index} className="p-4">
                          <div className="grid grid-cols-4 gap-4 md:grid-cols-8">
                            <div className="col-span-4 md:col-span-5">
                              <Label>Produto *</Label>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  className={`w-full justify-between h-9 ${
                                    !item.produtoId ? "text-muted-foreground" : ""
                                  }`}
                                  onClick={() => handleOpenProductSelector(index)}
                                  disabled={isSubmitting}
                                >
                                  <span className="truncate">{item.produtoNome || "Selecione um produto"}</span>
                                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </div>
                            </div>
                            <div className="col-span-3 md:col-span-2">
                              <Label>Qtd *</Label>
                              <Input
                                type="number"
                                min="1"
                                className="h-9"
                                value={item.quantidade ?? ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "quantidade",
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                disabled={isSubmitting}
                                required
                              />
                            </div>
                            <div className="col-span-1 md:col-span-1 flex items-end justify-end md:justify-start">
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => handleRemoveItem(index)}
                                disabled={isSubmitting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || isUploading}>
                  {isSubmitting || isUploading ? "Salvando..." : "Salvar Entrada"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para Visualizar Documentos */}
        <Dialog open={viewDocsOpen} onOpenChange={setViewDocsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Documentos Anexados</DialogTitle>
              <DialogDescription>
                Lista de arquivos anexados à entrada
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
               {isLoadingDocs ? (
                 <div className="py-4 text-center text-muted-foreground">Carregando documentos...</div>
               ) : currentDocs.length === 0 ? (
                 <div className="py-4 text-center text-muted-foreground">Nenhum documento anexado.</div>
               ) : (
                 <div className="space-y-2">
                    {currentDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                            <div className="flex items-center truncate">
                                <FileText className="mr-3 h-5 w-5 text-blue-500" />
                                <div className="truncate">
                                    <p className="text-sm font-medium truncate max-w-[200px]" title={doc.name}>{doc.name}</p>
                                    <p className="text-xs text-muted-foreground">{(doc.size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Baixar/Visualizar">
                                    <Upload className="h-4 w-4 rotate-180" /> {/* Download icon hack */}
                                </a>
                            </Button>
                        </div>
                    ))}
                 </div>
               )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
