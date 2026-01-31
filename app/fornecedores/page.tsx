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
import {
  getSuppliers,
  createSupplier,
  type DatabaseSupplier,
} from "@/lib/supabase/database";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Info, Truck } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  maskCNPJ,
  maskPhone,
  maskCellphone,
  unmaskCNPJ,
  unmaskPhone,
} from "@/lib/masks";
import { Badge } from "@/components/ui/badge";

export default function FornecedoresPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [fornecedores, setFornecedores] = useState<DatabaseSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const data = await getSuppliers(true);
        setFornecedores(data);
      } catch (error) {
        console.error("[v0] Error fetching suppliers:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os fornecedores",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.nome.trim()) {
        toast({
          title: "Erro",
          description: "O nome do fornecedor é obrigatório",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const cnpjNumbers = formData.cnpj ? unmaskCNPJ(formData.cnpj) : undefined;

      await createSupplier({
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
        description: "Fornecedor cadastrado com sucesso",
      });

      // Recarregar lista
      const data = await getSuppliers(true);
      setFornecedores(data);

      // Limpar formulário
      setFormData({
        nome: "",
        cnpj: "",
        telefone: "",
        celular: "",
        email: "",
        endereco: "",
        observacoes: "",
        ativo: true,
      });
      setShowAddForm(false);
    } catch (error: any) {
      console.error("[v0] Error creating supplier:", error);
      toast({
        title: "Erro",
        description:
          error?.message || "Não foi possível cadastrar o fornecedor",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatCNPJ = (cnpj?: string) => {
    if (!cnpj) return "-";
    if (cnpj.length === 14) {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
    }
    return cnpj;
  };

  const fornecedoresFiltrados = fornecedores.filter((fornecedor) => {
    const matchSearch =
      fornecedor.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fornecedor.cnpj?.includes(searchTerm.replace(/\D/g, "")) ||
      fornecedor.email?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchSearch;
  });

  const totalAtivos = fornecedores.filter((f) => f.ativo).length;

  return (
    <ProtectedRoute allowedRoles={["Coordenador", "Gerente", "admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Fornecedores</h2>
            <p className="text-muted-foreground">
              Cadastre e gerencie seus fornecedores
            </p>
          </div>
          {(user?.role === "admin" || user?.role === "Gerente") && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Fornecedor
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Fornecedores
              </CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fornecedores.length}</div>
              <p className="text-xs text-muted-foreground">
                Fornecedores cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Fornecedores Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAtivos}</div>
              <p className="text-xs text-muted-foreground">
                {fornecedores.length - totalAtivos} inativos
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Buscar Fornecedores</CardTitle>
            <CardDescription>
              Pesquise por nome, CNPJ ou email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Fornecedores</CardTitle>
            <CardDescription>
              {fornecedoresFiltrados.length} fornecedores encontrados
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
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fornecedoresFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Nenhum fornecedor encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    fornecedoresFiltrados.map((fornecedor) => (
                      <TableRow key={fornecedor.id}>
                        <TableCell className="font-medium">
                          {fornecedor.nome}
                        </TableCell>
                        <TableCell>{formatCNPJ(fornecedor.cnpj)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {fornecedor.email && (
                              <div>{fornecedor.email}</div>
                            )}
                            {fornecedor.telefone && (
                              <div className="text-muted-foreground">
                                {fornecedor.telefone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={fornecedor.ativo ? "default" : "secondary"}
                          >
                            {fornecedor.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(fornecedor.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="text-sm"
                          >
                            <Link href={`/fornecedores/${fornecedor.id}`}>
                              <Info className="h-4 w-4 mr-1" />
                              Detalhes
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Fornecedor</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo fornecedor
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Fornecedor *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  required
                  placeholder="Nome ou razão social"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) =>
                    setFormData({ ...formData, cnpj: maskCNPJ(e.target.value) })
                  }
                  placeholder="00.000.000/0000-00"
                  disabled={isSubmitting}
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
                  placeholder="(00) 0000-0000"
                  disabled={isSubmitting}
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
                  placeholder="(00) 00000-0000"
                  disabled={isSubmitting}
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
                  placeholder="fornecedor@exemplo.com"
                  disabled={isSubmitting}
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
                  placeholder="Rua, número, cidade - UF"
                  disabled={isSubmitting}
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
                  placeholder="Observações gerais sobre o fornecedor"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({
                    nome: "",
                    cnpj: "",
                    telefone: "",
                    celular: "",
                    email: "",
                    endereco: "",
                    observacoes: "",
                    ativo: true,
                  });
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Cadastrando..." : "Cadastrar Fornecedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
