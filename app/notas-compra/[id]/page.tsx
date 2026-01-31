"use client";

import { useState, useEffect, use } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  getPurchaseInvoiceById,
  updatePurchaseInvoiceStatus,
  type PurchaseInvoiceWithItems,
} from "@/lib/supabase/database";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Receipt,
  Truck,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function NotaCompraDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const { toast } = useToast();
  const [nota, setNota] = useState<PurchaseInvoiceWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal de pagamento
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    data_pagamento: new Date().toISOString().split("T")[0],
    forma_pagamento: "",
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getPurchaseInvoiceById(id);
        setNota(data);
      } catch (error) {
        console.error("[v0] Error fetching invoice:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a nota fiscal",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, toast]);

  const handleConfirmPayment = async () => {
    if (!nota) return;

    setIsProcessingPayment(true);
    try {
      await updatePurchaseInvoiceStatus(
        nota.id,
        "Pago",
        new Date(paymentData.data_pagamento).toISOString(),
        paymentData.forma_pagamento || undefined
      );

      toast({
        title: "Sucesso",
        description: "Nota marcada como paga",
      });

      // Recarregar dados
      const data = await getPurchaseInvoiceById(id);
      setNota(data);
      setShowPaymentModal(false);
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const isVencido =
      status === "Pendente" && new Date(dataVencimento) < new Date();
    const displayStatus = isVencido ? "Vencido" : status;

    switch (displayStatus) {
      case "Pago":
        return (
          <Badge className="bg-green-500 text-lg px-4 py-1">
            <CheckCircle className="h-4 w-4 mr-2" />
            Pago
          </Badge>
        );
      case "Vencido":
        return (
          <Badge variant="destructive" className="text-lg px-4 py-1">
            <AlertCircle className="h-4 w-4 mr-2" />
            Vencido
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-lg px-4 py-1">
            <Clock className="h-4 w-4 mr-2" />
            Pendente
          </Badge>
        );
    }
  };

  const canMarkAsPaid = user?.role === "admin" || user?.role === "Gerente";

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["Coordenador", "Gerente", "admin"]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!nota) {
    return (
      <ProtectedRoute allowedRoles={["Coordenador", "Gerente", "admin"]}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/notas-compra">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                Nota fiscal não encontrada
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  const isVencido =
    nota.status === "Pendente" && new Date(nota.data_vencimento) < new Date();
  const canPay = canMarkAsPaid && (nota.status === "Pendente" || isVencido);

  return (
    <ProtectedRoute allowedRoles={["Coordenador", "Gerente", "admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/notas-compra">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Receipt className="h-8 w-8" />
                Nota {nota.numero_nota}
              </h2>
              <p className="text-muted-foreground">
                Detalhes da nota fiscal de compra
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {getStatusBadge(nota.status, nota.data_vencimento)}
            {canPay && (
              <Button onClick={() => setShowPaymentModal(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar como Pago
              </Button>
            )}
          </div>
        </div>

        {/* Resumo */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fornecedor</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {nota.suppliers?.nome || "-"}
              </div>
              <Link
                href={`/fornecedores/${nota.supplier_id}`}
                className="text-xs text-blue-500 hover:underline"
              >
                Ver fornecedor
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data da Nota</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {formatDate(nota.data_nota)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencimento</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-xl font-bold ${
                  isVencido ? "text-red-600" : ""
                }`}
              >
                {formatDate(nota.data_vencimento)}
              </div>
              {isVencido && (
                <p className="text-xs text-red-500">Nota vencida</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(nota.valor_total)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informações do pagamento (se pago) */}
        {nota.status === "Pago" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Informações do Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground">
                    Data do Pagamento
                  </Label>
                  <p className="font-medium">
                    {nota.data_pagamento
                      ? formatDate(nota.data_pagamento)
                      : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Forma de Pagamento
                  </Label>
                  <p className="font-medium">{nota.forma_pagamento || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados da nota */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Nota</CardTitle>
            <CardDescription>
              Informações gerais da nota fiscal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Número da Nota</Label>
                <p className="font-medium">{nota.numero_nota}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Fornecedor</Label>
                <p className="font-medium">{nota.suppliers?.nome || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Data da Nota</Label>
                <p className="font-medium">{formatDate(nota.data_nota)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Data de Vencimento
                </Label>
                <p
                  className={`font-medium ${
                    isVencido ? "text-red-600" : ""
                  }`}
                >
                  {formatDate(nota.data_vencimento)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Cadastrado por</Label>
                <p className="font-medium">
                  {nota.profiles?.nome || nota.profiles?.email || "-"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Data de Cadastro</Label>
                <p className="font-medium">{formatDateTime(nota.created_at)}</p>
              </div>
              {nota.observacoes && (
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="font-medium">{nota.observacoes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Itens da nota */}
        <Card>
          <CardHeader>
            <CardTitle>Itens da Nota</CardTitle>
            <CardDescription>
              {nota.items?.length || 0} item(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!nota.items || nota.items.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum item encontrado
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nota.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.descricao}
                        </TableCell>
                        <TableCell>
                          {item.products?.nome || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantidade}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.valor_unitario)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.valor_total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 flex justify-end">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Valor Total da Nota
                    </div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(nota.valor_total)}
                    </div>
                  </div>
                </div>
              </>
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
              Confirme os dados do pagamento da nota {nota.numero_nota}
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
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Valor</div>
              <div className="text-xl font-bold">
                {formatCurrency(nota.valor_total)}
              </div>
            </div>
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
