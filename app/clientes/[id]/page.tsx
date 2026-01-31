"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { getClientById } from "@/lib/supabase/database";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, DollarSign, Package, ShoppingCart, UserCog, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

// Helper function to map database status to StatusBadge status
function mapStatusToBadge(
  status: string
): "aguardando" | "atrasado" | "devolvida" | "perda-total" {
  if (status === "Aguardando Devolução") return "aguardando";
  if (status === "Atrasado") return "atrasado";
  if (status === "Concluído") return "devolvida";
  if (status === "Perda Total") return "perda-total";
  return "aguardando";
}

export default function ClienteDetalhePage() {
  const params = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [cliente, setCliente] = useState<any>(null);
  const [vendedor, setVendedor] = useState<any>(null);
  const [pedidosCliente, setPedidosCliente] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createSupabaseClient();

  // Estados para o portal do cliente
  const [showPortalConfig, setShowPortalConfig] = useState(false);
  const [codigoAcesso, setCodigoAcesso] = useState("");
  const [senhaPortal, setSenhaPortal] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [isCreatingAccess, setIsCreatingAccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!params.id || typeof params.id !== "string") return;

      try {
        setIsLoading(true);
        const clienteData = await getClientById(params.id);
        if (!clienteData) return;

        setCliente(clienteData);

        // Get vendedor
        const { data: vendedorData } = await supabase
          .from("profiles")
          .select("id, nome")
          .eq("id", clienteData.vendedor_id)
          .single();

        setVendedor(vendedorData);

        // Get orders for this client
        const { data: ordersData } = await supabase
          .from("orders")
          .select("*, order_items (*)")
          .eq("cliente_id", params.id)
          .order("data_venda", { ascending: false });

        setPedidosCliente(ordersData || []);
      } catch (error) {
        console.error("[v0] Error loading cliente details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [params.id, supabase]);

  const pedidosPendentes = pedidosCliente.filter(
    (p) => p.status === "Aguardando Devolução" || p.status === "Atrasado"
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getDaysPending = (dataCriacao: string) => {
    const created = new Date(dataCriacao);
    const now = new Date();
    const diff = now.getTime() - created.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const handleCreatePortalAccess = async () => {
    if (!codigoAcesso.trim() || !senhaPortal.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o código de acesso e a senha",
        variant: "destructive",
      });
      return;
    }

    if (senhaPortal.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingAccess(true);

    try {
      const response = await fetch("/api/create-client-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: cliente.id,
          codigoAcesso: codigoAcesso.trim(),
          senha: senhaPortal,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("[v0] API error response:", result);
        const errorMessage = result.details
          ? `${result.error}\n\nDetalhes: ${result.details}`
          : result.error || "Erro ao criar acesso";
        throw new Error(errorMessage);
      }

      toast({
        title: "Sucesso",
        description: "Acesso ao portal criado com sucesso!",
      });

      // Atualizar dados do cliente
      const clienteData = await getClientById(params.id as string);
      setCliente(clienteData);
      setShowPortalConfig(false);
      setCodigoAcesso("");
      setSenhaPortal("");
    } catch (error: any) {
      console.error("[v0] Error creating portal access:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o acesso ao portal",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAccess(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="text-center text-muted-foreground">Carregando...</div>
      </ProtectedRoute>
    );
  }

  if (!cliente) {
    return (
      <ProtectedRoute>
        <div className="text-center">
          <h2 className="text-2xl font-bold">Cliente não encontrado</h2>
          <Button className="mt-4" asChild>
            <Link href="/clientes">Voltar para Clientes</Link>
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clientes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {cliente.nome}
            </h2>
            <p className="text-muted-foreground">Vendedor: {vendedor?.nome}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Débito Total"
            value={formatCurrency(cliente.debitoTotal)}
            icon={DollarSign}
            description="Total de débitos pendentes"
          />
          <StatCard
            title="Carcaças Pendentes"
            value={cliente.carcacasPendentes}
            icon={Package}
            description="Aguardando devolução"
          />
          <StatCard
            title="Total de Pedidos"
            value={pedidosCliente.length}
            icon={ShoppingCart}
            description="Pedidos realizados"
          />
          <StatCard
            title="Lucro sobre Carcaça"
            value={formatCurrency(
              pedidosCliente.reduce((sum: number, pedido: any) => {
                return (
                  sum +
                  (pedido.order_items?.reduce((itemSum: number, item: any) => {
                    return itemSum + (item.retained_revenue_carcass || 0);
                  }, 0) || 0)
                );
              }, 0)
            )}
            icon={DollarSign}
            description="Total gerado nas negociações"
          />
        </div>

        {/* Card de Configuração do Portal do Cliente */}
        {(user?.role === "admin" || user?.role === "Gerente" || user?.role === "Coordenador") && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="h-5 w-5" />
                    Acesso ao Portal do Cliente
                  </CardTitle>
                  <CardDescription>
                    Configure o acesso do cliente ao portal para visualizar pedidos e carcaças
                  </CardDescription>
                </div>
                {cliente.portal_habilitado && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Portal Habilitado</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {cliente.portal_habilitado ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground mb-2">Código de Acesso:</p>
                    <p className="font-mono text-lg font-bold">{cliente.codigo_acesso}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      O cliente pode fazer login na mesma página de login usando este código como email: <span className="font-mono">{cliente.codigo_acesso}@portal.platocom.com.br</span>
                    </p>
                  </div>
                </div>
              ) : showPortalConfig ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="codigoAcesso">Código de Acesso *</Label>
                      <Input
                        id="codigoAcesso"
                        value={codigoAcesso}
                        onChange={(e) => setCodigoAcesso(e.target.value.replace(/\s/g, ""))}
                        placeholder="Ex: cliente123"
                        disabled={isCreatingAccess}
                      />
                      <p className="text-xs text-muted-foreground">
                        Código único para o cliente fazer login (sem espaços)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senhaPortal">Senha *</Label>
                      <div className="relative">
                        <Input
                          id="senhaPortal"
                          type={showSenha ? "text" : "password"}
                          value={senhaPortal}
                          onChange={(e) => setSenhaPortal(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          disabled={isCreatingAccess}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowSenha(!showSenha)}
                        >
                          {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreatePortalAccess} disabled={isCreatingAccess}>
                      {isCreatingAccess ? "Criando..." : "Criar Acesso ao Portal"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPortalConfig(false);
                        setCodigoAcesso("");
                        setSenhaPortal("");
                      }}
                      disabled={isCreatingAccess}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowPortalConfig(true)}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Configurar Acesso ao Portal
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Carcaças Pendentes</CardTitle>
            <CardDescription>
              Pedidos aguardando devolução de carcaça
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Débito</TableHead>
                  <TableHead className="text-center">Dias Pendente</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  // Coletar todos os itens pendentes de todos os pedidos
                  const itensPendentes: Array<{
                    pedido: any;
                    item: any;
                  }> = [];

                  pedidosPendentes.forEach((pedido) => {
                    pedido.order_items?.forEach((item: any) => {
                      // Incluir apenas itens com débito de carcaça pendente
                      if (item.debito_carcaca > 0) {
                        itensPendentes.push({ pedido, item });
                      }
                    });
                  });

                  if (itensPendentes.length === 0) {
                    return (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          Nenhuma carcaça pendente
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return itensPendentes.map(({ pedido, item }, index) => (
                    <TableRow key={`${pedido.id}-${item.id}-${index}`}>
                      <TableCell className="font-mono text-sm">
                        <Link
                          href={`/pedidos/${pedido.numero_pedido}`}
                          className="hover:underline"
                        >
                          {pedido.numero_pedido}
                        </Link>
                      </TableCell>
                      <TableCell>{item.produto_nome || "-"}</TableCell>
                      <TableCell className="text-right">
                        {item.debito_carcaca}{" "}
                        {item.debito_carcaca === 1 ? "Carcaça" : "Carcaças"}
                      </TableCell>
                      <TableCell className="text-center">
                        {getDaysPending(pedido.data_venda)} dias
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={mapStatusToBadge(pedido.status)} />
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Pedidos</CardTitle>
            <CardDescription>Todos os pedidos do cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidosCliente.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      Nenhum pedido encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  pedidosCliente.map((pedido) => {
                    const primeiroItem = pedido.order_items?.[0];
                    return (
                      <TableRow key={pedido.id}>
                        <TableCell className="font-mono text-sm">
                          <Link
                            href={`/pedidos/${pedido.numero_pedido}`}
                            className="hover:underline"
                          >
                            {pedido.numero_pedido}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {primeiroItem?.produto_nome || "-"}
                        </TableCell>
                        <TableCell>
                          {pedido.tipo_venda === "Base de Troca"
                            ? "Base de Troca"
                            : "Normal"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(pedido.valor_total || 0)}
                        </TableCell>
                        <TableCell>{formatDate(pedido.data_venda)}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={mapStatusToBadge(pedido.status)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
