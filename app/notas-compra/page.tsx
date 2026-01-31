"use client";

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
import { useAuth } from "@/lib/auth-context";
import {
  getPurchaseInvoices,
  getPurchaseInvoicesStats,
  getSuppliers,
  updatePurchaseInvoiceStatus,
  type DatabasePurchaseInvoice,
  type DatabaseSupplier,
  type PurchaseInvoiceStatus,
} from "@/lib/supabase/database";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Receipt,
  Search,
  Info,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function NotasCompraPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("all");
  const [fornecedorFiltro, setFornecedorFiltro] = useState<string>("all");
  const [notas, setNotas] = useState<DatabasePurchaseInvoice[]>([]);
  const [fornecedores, setFornecedores] = useState<DatabaseSupplier[]>([]);
  const [stats, setStats] = useState({
    totalPendente: 0,
    totalPago: 0,
    totalVencido: 0,
    countPendente: 0,
    countPago: 0,
    countVencido: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Modal de pagamento
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedNota, setSelectedNota] = useState<DatabasePurchaseInvoice | null>(null);
  const [paymentData, setPaymentData] = useState({
    data_pagamento: new Date().toISOString().split("T")[0],
    forma_pagamento: "",
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [notasData, fornecedoresData, statsData] = await Promise.all([
          getPurchaseInvoices({
            status: statusFiltro !== "all" ? (statusFiltro as PurchaseInvoiceStatus) : undefined,
            supplier_id: fornecedorFiltro !== "all" ? fornecedorFiltro : undefined,
          }),
          getSuppliers(),
          getPurchaseInvoicesStats(),
        ]);

        setNotas(notasData);
        setFornecedores(fornecedoresData);
        setStats(statsData);
      } catch (error) {
        console.error("[v0] Error fetching data:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as notas fiscais",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [statusFiltro, fornecedorFiltro, toast]);

  const handleMarcarPago = (nota: DatabasePurchaseInvoice) => {
    setSelectedNota(nota);
    setPaymentData({
      data_pagamento: new Date().toISOString().split("T")[0],
      forma_pagamento: "",
    });
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedNota) return;

    setIsProcessingPayment(true);
    try {
      await updatePurchaseInvoiceStatus(
        selectedNota.id,
        "Pago",
        new Date(paymentData.data_pagamento).toISOString(),
        paymentData.forma_pagamento || undefined
      );

      toast({
        title: "Sucesso",
        description: "Nota marcada como paga",
      });

      // Recarregar dados
      const [notasData, statsData] = await Promise.all([
        getPurchaseInvoices({
          status: statusFiltro !== "all" ? (statusFiltro as PurchaseInvoiceStatus) : undefined,
          supplier_id: fornecedorFiltro !== "all" ? fornecedorFiltro : undefined,
        }),
        getPurchaseInvoicesStats(),
      ]);

      setNotas(notasData);
      setStats(statsData);
      setShowPaymentModal(false);
      setSelectedNota(null);
    } catch (error: any) {
      console.error("[v0] Error updating payment:", error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível atualizar o status",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
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

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const isVencido =
      status === "Pendente" && new Date(dataVencimento) < new Date();
    const displayStatus = isVencido ? "Vencido" : status;

    switch (displayStatus) {
      case "Pago":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Pago
          </Badge>
        );
      case "Vencido":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Vencido
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  const notasFiltradas = notas.filter((nota) => {
    const matchSearch =
      nota.numero_nota?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nota.suppliers?.nome?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchSearch;
  });

  const canMarkAsPaid = user?.role === "admin" || user?.role === "Gerente";

  return (
    <ProtectedRoute allowedRoles={["Coordenador", "Gerente", "admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Notas de Compra
            </h2>
            <p className="text-muted-foreground">
              Gerencie as notas fiscais de entrada e controle de pagamentos
            </p>
          </div>
          <Button asChild>
            <Link href="/notas-compra/nova">
              <Plus className="mr-2 h-4 w-4" />
              Nova Nota
            </Link>
          </Button>
        </div>

        {/* Cards de resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notas</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.countPendente + stats.countPago + stats.countVencido}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(
                  stats.totalPendente + stats.totalPago + stats.totalVencido
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(stats.totalPendente)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.countPendente} nota(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencido</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalVencido)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.countVencido} nota(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pago</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalPago)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.countPago} nota(s)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Busque e filtre notas fiscais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Vencido">Vencido</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={fornecedorFiltro}
                onValueChange={setFornecedorFiltro}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {fornecedores.map((fornecedor) => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de notas */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Notas Fiscais</CardTitle>
            <CardDescription>
              {notasFiltradas.length} notas encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Data Nota</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        Nenhuma nota fiscal encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    notasFiltradas.map((nota) => {
                      const isVencido =
                        nota.status === "Pendente" &&
                        new Date(nota.data_vencimento) < new Date();
                      const canPay =
                        canMarkAsPaid &&
                        (nota.status === "Pendente" || isVencido);

                      return (
                        <TableRow key={nota.id}>
                          <TableCell className="font-medium">
                            {nota.numero_nota}
                          </TableCell>
                          <TableCell>
                            {nota.suppliers?.nome || "-"}
                          </TableCell>
                          <TableCell>{formatDate(nota.data_nota)}</TableCell>
                          <TableCell>
                            <span
                              className={
                                isVencido ? "text-red-600 font-medium" : ""
                              }
                            >
                              {formatDate(nota.data_vencimento)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(nota.valor_total)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(nota.status, nota.data_vencimento)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {canPay && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarcarPago(nota)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Pagar
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/notas-compra/${nota.id}`}>
                                  <Info className="h-4 w-4 mr-1" />
                                  Detalhes
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de pagamento */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Pago</DialogTitle>
            <DialogDescription>
              Confirme os dados do pagamento da nota {selectedNota?.numero_nota}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="data_pagamento">Data do Pagamento</Label>
              <Input
                id="data_pagamento"
                type="date"
                value={paymentData.data_pagamento}
                onChange={(e) =>
                  setPaymentData({
                    ...paymentData,
                    data_pagamento: e.target.value,
                  })
                }
                disabled={isProcessingPayment}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
              <Select
                value={paymentData.forma_pagamento}
                onValueChange={(value) =>
                  setPaymentData({ ...paymentData, forma_pagamento: value })
                }
                disabled={isProcessingPayment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedNota && (
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Valor</div>
                <div className="text-xl font-bold">
                  {formatCurrency(selectedNota.valor_total)}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              disabled={isProcessingPayment}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? "Processando..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
