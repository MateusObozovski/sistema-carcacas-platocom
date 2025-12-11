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
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { getVendedores, getClients, getOrders } from "@/lib/supabase/database";
import Link from "next/link";
import { Search, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PedidosPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [vendedorFiltro, setVendedorFiltro] = useState<string>("todos");
  const [clienteFiltro, setClienteFiltro] = useState<string>("todos");
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("todos");
  const [pedidoOrigemFiltro, setPedidoOrigemFiltro] = useState<string>("");
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return;

        setIsLoading(true);

        // Buscar pedidos com relações - se for vendedor, só seus pedidos; outras roles veem todos
        let query = supabase
          .from("orders")
          .select("*, clients(nome), profiles(nome)")
          .order("data_venda", { ascending: false });

        if (user.role === "Vendedor") {
          query = query.eq("vendedor_id", user.id);
        }

        const { data: pedidosData, error: pedidosError } = await query;

        if (pedidosError) {
          console.error("[v0] Error fetching orders:", pedidosError);
          return;
        }

        setPedidos(pedidosData || []);

        // Buscar vendedores para o filtro (apenas para roles que podem ver todos)
        if (user.role !== "Vendedor") {
          const vendedoresData = await getVendedores();
          setVendedores(vendedoresData || []);
        }

        // Buscar clientes para o filtro
        const clientesData =
          user.role === "Vendedor"
            ? await getClients(user.id)
            : await getClients();
        setClientes(clientesData || []);
      } catch (error) {
        console.error("[v0] Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  // Helper function to map database status to StatusBadge status
  const mapStatusToBadge = (
    status: string
  ): "aguardando" | "atrasado" | "devolvida" | "perda-total" => {
    if (status === "Aguardando Devolução") return "aguardando";
    if (status === "Atrasado") return "atrasado";
    if (status === "Concluído") return "devolvida";
    if (status === "Perda Total") return "perda-total";
    return "aguardando"; // fallback
  };

  // Obter lista de empresas únicas dos pedidos
  const empresas = Array.from(
    new Set(pedidos.map((p) => p.empresa).filter((e) => e != null))
  ).sort();

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const matchSearch =
      pedido.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.clients?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.numero_pedido_origem
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchStatus =
      statusFiltro === "todos" || pedido.status === statusFiltro;
    const matchVendedor =
      vendedorFiltro === "todos" || pedido.vendedor_id === vendedorFiltro;
    const matchCliente =
      clienteFiltro === "todos" || pedido.cliente_id === clienteFiltro;
    const matchEmpresa =
      empresaFiltro === "todos" || pedido.empresa === empresaFiltro;
    const matchPedidoOrigem =
      !pedidoOrigemFiltro ||
      pedido.numero_pedido_origem
        ?.toLowerCase()
        .includes(pedidoOrigemFiltro.toLowerCase());

    return (
      matchSearch &&
      matchStatus &&
      matchVendedor &&
      matchCliente &&
      matchEmpresa &&
      matchPedidoOrigem
    );
  });

  return (
    <ProtectedRoute
      allowedRoles={["Vendedor", "Coordenador", "Gerente", "admin"]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Pedidos</h2>
            <p className="text-muted-foreground">
              Visualize e gerencie todos os pedidos
            </p>
          </div>
          <Button asChild>
            <Link href="/nova-venda">Nova Venda</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Busque e filtre pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número..."
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
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="Aguardando Devolução">
                    Aguardando Devolução
                  </SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                  <SelectItem value="Perda Total">Perda Total</SelectItem>
                </SelectContent>
              </Select>
              {user?.role !== "Vendedor" && (
                <Select
                  value={vendedorFiltro}
                  onValueChange={setVendedorFiltro}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os vendedores</SelectItem>
                    {vendedores.map((vendedor) => (
                      <SelectItem key={vendedor.id} value={vendedor.id}>
                        {vendedor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={clienteFiltro} onValueChange={setClienteFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as empresas</SelectItem>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa} value={empresa}>
                      {empresa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Nº Pedido Origem..."
                value={pedidoOrigemFiltro}
                onChange={(e) => setPedidoOrigemFiltro(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Pedidos</CardTitle>
            <CardDescription>
              {pedidosFiltrados.length} pedidos encontrados
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
                    <TableHead>Cliente</TableHead>
                    <TableHead>Nº Pedido Origem</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    {(user?.role === "admin" ||
                      user?.role === "Gerente" ||
                      user?.role === "Coordenador") && (
                      <TableHead>Vendedor</TableHead>
                    )}
                    <TableHead>Obs.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={user?.role === "Vendedor" ? 9 : 10}
                        className="text-center text-muted-foreground"
                      >
                        Nenhum pedido encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    pedidosFiltrados.map((pedido) => (
                      <TableRow key={pedido.id}>
                        <TableCell className="font-mono text-sm">
                          <Link
                            href={`/pedidos/${pedido.numero_pedido}`}
                            className="hover:underline"
                            prefetch={false}
                          >
                            {pedido.numero_pedido}
                          </Link>
                        </TableCell>
                        <TableCell>{pedido.clients?.nome || "-"}</TableCell>
                        <TableCell className="text-sm">
                          {pedido.numero_pedido_origem || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {pedido.empresa || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(pedido.valor_total || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {pedido.debito_carcaca > 0
                            ? `${pedido.debito_carcaca} carcaça(s)`
                            : "-"}
                        </TableCell>
                        <TableCell>{formatDate(pedido.data_venda)}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status={mapStatusToBadge(pedido.status)}
                          />
                        </TableCell>
                        {(user?.role === "admin" ||
                          user?.role === "Gerente" ||
                          user?.role === "Coordenador") && (
                          <TableCell>{pedido.profiles?.nome || "-"}</TableCell>
                        )}
                        <TableCell>
                          {pedido.observacoes ? (
                            <div className="relative inline-block group">
                              <AlertCircle className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                              <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                <div className="bg-popover text-popover-foreground text-sm rounded-md border border-border shadow-lg p-3 max-w-xs whitespace-normal wrap-break-word">
                                  {pedido.observacoes}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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
    </ProtectedRoute>
  );
}
