"use client";

import type React from "react";
import { useState, useEffect, use } from "react";
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
import {
  getSupplierById,
  updateSupplier,
  getPurchaseInvoicesBySupplier,
  type DatabaseSupplier,
  type DatabasePurchaseInvoice,
} from "@/lib/supabase/database";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  Truck,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  maskCNPJ,
  maskPhone,
  maskCellphone,
  unmaskCNPJ,
  unmaskPhone,
} from "@/lib/masks";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export default function FornecedorDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [fornecedor, setFornecedor] = useState<DatabaseSupplier | null>(null);
  const [notas, setNotas] = useState<DatabasePurchaseInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    celular: "",
    email: "",
    endereco: "",
    observacoes: "",
    ativo: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [supplierData, invoicesData] = await Promise.all([
          getSupplierById(id),
          getPurchaseInvoicesBySupplier(id),
        ]);

        setFornecedor(supplierData);
        setNotas(invoicesData);

        setFormData({
          nome: supplierData.nome,
          cnpj: supplierData.cnpj ? maskCNPJ(supplierData.cnpj) : "",
          telefone: supplierData.telefone || "",
          celular: supplierData.celular || "",
          email: supplierData.email || "",
          endereco: supplierData.endereco || "",
          observacoes: supplierData.observacoes || "",
          ativo: supplierData.ativo,
        });
      } catch (error) {
        console.error("[v0] Error fetching supplier:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do fornecedor",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, toast]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (!formData.nome.trim()) {
        toast({
          title: "Erro",
          description: "O nome do fornecedor é obrigatório",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const cnpjNumbers = formData.cnpj ? unmaskCNPJ(formData.cnpj) : undefined;

      await updateSupplier(id, {
        nome: formData.nome.trim(),
        cnpj: cnpjNumbers || undefined,
        telefone: formData.telefone
          ? unmaskPhone(formData.telefone)
          : undefined,
        celular: formData.celular ? unmaskPhone(formData.celular) : undefined,
        email: formData.email.trim() || undefined,
        endereco: formData.endereco.trim() || undefined,
        observacoes: formData.observacoes.trim() || undefined,
        ativo: formData.ativo,
      });

      toast({
        title: "Sucesso",
        description: "Fornecedor atualizado com sucesso",
      });

      // Recarregar dados
      const supplierData = await getSupplierById(id);
      setFornecedor(supplierData);
      setIsEditing(false);
    } catch (error: any) {
      console.error("[v0] Error updating supplier:", error);
      toast({
        title: "Erro",
        description:
          error?.message || "Não foi possível atualizar o fornecedor",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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

  // Calcular resumo das notas
  const resumo = notas.reduce(
    (acc, nota) => {
      const isVencido =
        nota.status === "Pendente" && new Date(nota.data_vencimento) < new Date();
      if (nota.status === "Pago") {
        acc.totalPago += nota.valor_total;
        acc.countPago++;
      } else if (isVencido || nota.status === "Vencido") {
        acc.totalVencido += nota.valor_total;
        acc.countVencido++;
      } else {
        acc.totalPendente += nota.valor_total;
        acc.countPendente++;
      }
      return acc;
    },
    {
      totalPago: 0,
      totalPendente: 0,
      totalVencido: 0,
      countPago: 0,
      countPendente: 0,
      countVencido: 0,
    }
  );

  const canEdit = user?.role === "admin" || user?.role === "Gerente";

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["Coordenador", "Gerente", "admin"]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!fornecedor) {
    return (
      <ProtectedRoute allowedRoles={["Coordenador", "Gerente", "admin"]}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/fornecedores">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                Fornecedor não encontrado
              </div>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["Coordenador", "Gerente", "admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/fornecedores">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Truck className="h-8 w-8" />
                {fornecedor.nome}
              </h2>
              <p className="text-muted-foreground">
                Detalhes e notas fiscais do fornecedor
              </p>
            </div>
          </div>
          {canEdit && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>Editar</Button>
          )}
        </div>

        {/* Resumo de notas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notas.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(resumo.totalPendente)}
              </div>
              <p className="text-xs text-muted-foreground">
                {resumo.countPendente} nota(s)
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
                {formatCurrency(resumo.totalVencido)}
              </div>
              <p className="text-xs text-muted-foreground">
                {resumo.countVencido} nota(s)
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
                {formatCurrency(resumo.totalPago)}
              </div>
              <p className="text-xs text-muted-foreground">
                {resumo.countPago} nota(s)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dados do fornecedor */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Cadastrais</CardTitle>
            <CardDescription>
              Informações do fornecedor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({ ...formData, nome: e.target.value })
                      }
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cnpj: maskCNPJ(e.target.value),
                        })
                      }
                      disabled={isSaving}
                      maxLength={18}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telefone: maskPhone(e.target.value),
                        })
                      }
                      disabled={isSaving}
                      maxLength={14}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="celular">Celular</Label>
                    <Input
                      id="celular"
                      value={formData.celular}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          celular: maskCellphone(e.target.value),
                        })
                      }
                      disabled={isSaving}
                      maxLength={15}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      value={formData.endereco}
                      onChange={(e) =>
                        setFormData({ ...formData, endereco: e.target.value })
                      }
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Input
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) =>
                        setFormData({ ...formData, observacoes: e.target.value })
                      }
                      disabled={isSaving}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ativo"
                      checked={formData.ativo}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, ativo: checked })
                      }
                      disabled={isSaving}
                    />
                    <Label htmlFor="ativo">Fornecedor ativo</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        nome: fornecedor.nome,
                        cnpj: fornecedor.cnpj ? maskCNPJ(fornecedor.cnpj) : "",
                        telefone: fornecedor.telefone || "",
                        celular: fornecedor.celular || "",
                        email: fornecedor.email || "",
                        endereco: fornecedor.endereco || "",
                        observacoes: fornecedor.observacoes || "",
                        ativo: fornecedor.ativo,
                      });
                    }}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Nome</Label>
                  <p className="font-medium">{fornecedor.nome}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">CNPJ</Label>
                  <p className="font-medium">
                    {fornecedor.cnpj ? maskCNPJ(fornecedor.cnpj) : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Telefone</Label>
                  <p className="font-medium">{fornecedor.telefone || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Celular</Label>
                  <p className="font-medium">{fornecedor.celular || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{fornecedor.email || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Endereço</Label>
                  <p className="font-medium">{fornecedor.endereco || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p>
                    <Badge variant={fornecedor.ativo ? "default" : "secondary"}>
                      {fornecedor.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="font-medium">{fornecedor.observacoes || "-"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de notas fiscais */}
        <Card>
          <CardHeader>
            <CardTitle>Notas Fiscais</CardTitle>
            <CardDescription>
              Histórico de notas fiscais deste fornecedor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notas.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma nota fiscal encontrada para este fornecedor
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Data Nota</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notas.map((nota) => (
                    <TableRow key={nota.id}>
                      <TableCell className="font-medium">
                        {nota.numero_nota}
                      </TableCell>
                      <TableCell>{formatDate(nota.data_nota)}</TableCell>
                      <TableCell>{formatDate(nota.data_vencimento)}</TableCell>
                      <TableCell>{formatCurrency(nota.valor_total)}</TableCell>
                      <TableCell>
                        {getStatusBadge(nota.status, nota.data_vencimento)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/notas-compra/${nota.id}`}>
                            Detalhes
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
