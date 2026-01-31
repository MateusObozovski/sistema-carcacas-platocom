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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import {
  getSuppliers,
  getProducts,
  createPurchaseInvoice,
  type DatabaseSupplier,
  type DatabaseProduct,
} from "@/lib/supabase/database";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";

interface ItemNota {
  id: string;
  produto_id?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export default function NovaNotaCompraPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [fornecedores, setFornecedores] = useState<DatabaseSupplier[]>([]);
  const [produtos, setProdutos] = useState<DatabaseProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    supplier_id: "",
    numero_nota: "",
    data_nota: new Date().toISOString().split("T")[0],
    data_vencimento: "",
    observacoes: "",
  });

  const [itens, setItens] = useState<ItemNota[]>([]);
  const [novoItem, setNovoItem] = useState<ItemNota>({
    id: "",
    produto_id: "",
    descricao: "",
    quantidade: 1,
    valor_unitario: 0,
    valor_total: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fornecedoresData, produtosData] = await Promise.all([
          getSuppliers(),
          getProducts(),
        ]);

        setFornecedores(fornecedoresData);
        setProdutos(produtosData);
      } catch (error) {
        console.error("[v0] Error fetching data:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleProdutoChange = (produtoId: string) => {
    const produto = produtos.find((p) => p.id === produtoId);
    if (produto) {
      setNovoItem({
        ...novoItem,
        produto_id: produtoId,
        descricao: produto.nome,
        valor_unitario: produto.preco_base,
        valor_total: produto.preco_base * novoItem.quantidade,
      });
    } else {
      setNovoItem({
        ...novoItem,
        produto_id: "",
      });
    }
  };

  const handleQuantidadeChange = (quantidade: number) => {
    setNovoItem({
      ...novoItem,
      quantidade,
      valor_total: novoItem.valor_unitario * quantidade,
    });
  };

  const handleValorUnitarioChange = (valor: number) => {
    setNovoItem({
      ...novoItem,
      valor_unitario: valor,
      valor_total: valor * novoItem.quantidade,
    });
  };

  const handleAdicionarItem = () => {
    if (!novoItem.descricao.trim()) {
      toast({
        title: "Erro",
        description: "Preencha a descrição do item",
        variant: "destructive",
      });
      return;
    }

    if (novoItem.quantidade <= 0) {
      toast({
        title: "Erro",
        description: "Quantidade deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    if (novoItem.valor_unitario <= 0) {
      toast({
        title: "Erro",
        description: "Valor unitário deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    const newItem: ItemNota = {
      ...novoItem,
      id: Date.now().toString(),
      valor_total: novoItem.valor_unitario * novoItem.quantidade,
    };

    setItens([...itens, newItem]);
    setNovoItem({
      id: "",
      produto_id: "",
      descricao: "",
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
    });
  };

  const handleRemoverItem = (id: string) => {
    setItens(itens.filter((item) => item.id !== id));
  };

  const valorTotal = itens.reduce((sum, item) => sum + item.valor_total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.supplier_id) {
        toast({
          title: "Erro",
          description: "Selecione um fornecedor",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (!formData.numero_nota.trim()) {
        toast({
          title: "Erro",
          description: "Informe o número da nota",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (!formData.data_nota) {
        toast({
          title: "Erro",
          description: "Informe a data da nota",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (!formData.data_vencimento) {
        toast({
          title: "Erro",
          description: "Informe a data de vencimento",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (itens.length === 0) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos um item à nota",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      await createPurchaseInvoice(
        {
          supplier_id: formData.supplier_id,
          numero_nota: formData.numero_nota.trim(),
          data_nota: new Date(formData.data_nota).toISOString(),
          data_vencimento: new Date(formData.data_vencimento).toISOString(),
          valor_total: valorTotal,
          status: "Pendente",
          observacoes: formData.observacoes.trim() || undefined,
          created_by: user!.id,
        },
        itens.map((item) => ({
          produto_id: item.produto_id || undefined,
          descricao: item.descricao,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
        }))
      );

      toast({
        title: "Sucesso",
        description: "Nota fiscal cadastrada com sucesso",
      });

      router.push("/notas-compra");
    } catch (error: any) {
      console.error("[v0] Error creating invoice:", error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível cadastrar a nota fiscal",
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

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["Coordenador", "Gerente", "admin"]}>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["Coordenador", "Gerente", "admin"]}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild type="button">
              <Link href="/notas-compra">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Nova Nota de Compra
              </h2>
              <p className="text-muted-foreground">
                Cadastre uma nova nota fiscal de entrada
              </p>
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Salvando..." : "Salvar Nota"}
          </Button>
        </div>

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
              <div className="space-y-2">
                <Label htmlFor="supplier_id">Fornecedor *</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, supplier_id: value })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((fornecedor) => (
                      <SelectItem key={fornecedor.id} value={fornecedor.id}>
                        {fornecedor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_nota">Número da Nota *</Label>
                <Input
                  id="numero_nota"
                  value={formData.numero_nota}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_nota: e.target.value })
                  }
                  placeholder="Ex: 12345"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_nota">Data da Nota *</Label>
                <Input
                  id="data_nota"
                  type="date"
                  value={formData.data_nota}
                  onChange={(e) =>
                    setFormData({ ...formData, data_nota: e.target.value })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
                <Input
                  id="data_vencimento"
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) =>
                    setFormData({ ...formData, data_vencimento: e.target.value })
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  placeholder="Observações sobre a nota fiscal"
                  disabled={isSubmitting}
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Adicionar itens */}
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Item</CardTitle>
            <CardDescription>
              Adicione os itens da nota fiscal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5 items-end">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="produto">Produto (opcional)</Label>
                <Select
                  value={novoItem.produto_id || "none"}
                  onValueChange={(value) =>
                    handleProdutoChange(value === "none" ? "" : value)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (digitar manualmente)</SelectItem>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="descricao">Descrição *</Label>
                <Input
                  id="descricao"
                  value={novoItem.descricao}
                  onChange={(e) =>
                    setNovoItem({ ...novoItem, descricao: e.target.value })
                  }
                  placeholder="Descrição do item"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={novoItem.quantidade}
                  onChange={(e) =>
                    handleQuantidadeChange(Number(e.target.value))
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_unitario">Valor Unitário *</Label>
                <Input
                  id="valor_unitario"
                  type="number"
                  min="0"
                  step="0.01"
                  value={novoItem.valor_unitario}
                  onChange={(e) =>
                    handleValorUnitarioChange(Number(e.target.value))
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor Total</Label>
                <div className="h-10 flex items-center font-medium">
                  {formatCurrency(novoItem.valor_total)}
                </div>
              </div>

              <div>
                <Button
                  type="button"
                  onClick={handleAdicionarItem}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de itens */}
        <Card>
          <CardHeader>
            <CardTitle>Itens da Nota</CardTitle>
            <CardDescription>
              {itens.length} item(s) adicionado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itens.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum item adicionado. Adicione itens usando o formulário acima.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell className="text-center">
                          {item.quantidade}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.valor_unitario)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.valor_total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoverItem(item.id)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
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
                      {formatCurrency(valorTotal)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </form>
    </ProtectedRoute>
  );
}
