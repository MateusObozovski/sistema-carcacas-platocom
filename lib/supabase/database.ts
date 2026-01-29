import { createClient } from "@/lib/supabase/client";

export interface DatabaseProduct {
  id: string;
  nome: string;
  marca: string;
  tipo: string;
  categoria: string;
  aplicacao?: string;
  diametro?: string;
  codigo?: string;
  codigo_fabricante?: string;
  observacoes?: string;
  sigla_marca?: string;
  preco_base: number;
  desconto_maximo_bt: number; // Manter para compatibilidade, mas será calculado dinamicamente
  carcass_value: number; // Valor fixo da carcaça em reais
  ativo: boolean;
  created_at: string;
}

export interface DatabaseClient {
  id: string;
  nome: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  vendedor_id: string;
  ativo: boolean;
  created_at: string;
}

export interface DatabaseOrder {
  id: string;
  numero_pedido: string;
  cliente_id: string;
  vendedor_id: string;
  tipo_venda: string;
  valor_total: number;
  debito_carcaca: number;
  status: string;
  data_venda: string;
  data_devolucao?: string;
  observacoes?: string;
  numero_pedido_origem?: string;
  empresa?: "Platocom" | "R.D.C" | "Rita de Cássia" | "Tork" | "Thiago";
  created_at: string;
}

export interface DatabaseOrderItem {
  id: string;
  order_id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  desconto_percentual: number;
  preco_final: number;
  debito_carcaca: number;
  retained_revenue_carcass: number; // Valor gerado (lucro) na negociação da carcaça
  tipo_venda: string;
}

// Products
export async function getProducts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error("[v0] Error fetching products:", error);
    throw error;
  }

  return data as DatabaseProduct[];
}

export async function getAllProducts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.error("[v0] Error fetching all products:", error);
    throw error;
  }

  return data as DatabaseProduct[];
}

/**
 * Busca produtos com paginação e filtros
 */
export interface ProductFilters {
  searchTerm?: string;
  marca?: string;
  tipo?: string;
  categoria?: string;
  ativo?: boolean;
}

export async function getProductsPaginated(
  page: number = 1,
  pageSize: number = 50,
  filters?: ProductFilters
) {
  const supabase = createClient();
  
  let query = supabase
    .from("products")
    .select("*", { count: "exact" });

  // Aplicar filtros
  if (filters?.ativo !== undefined) {
    query = query.eq("ativo", filters.ativo);
  }

  if (filters?.marca && filters.marca !== "all") {
    query = query.eq("marca", filters.marca);
  }

  if (filters?.tipo && filters.tipo !== "all") {
    query = query.eq("tipo", filters.tipo);
  }

  if (filters?.categoria && filters.categoria !== "all") {
    query = query.eq("categoria", filters.categoria);
  }

  if (filters?.searchTerm && filters.searchTerm.trim()) {
    const searchLower = filters.searchTerm.toLowerCase().replace(/\*/g, "%");
    query = query.or(
      `nome.ilike.%${searchLower}%,marca.ilike.%${searchLower}%,codigo.ilike.%${searchLower}%,codigo_fabricante.ilike.%${searchLower}%,aplicacao.ilike.%${searchLower}%`
    );
  }

  // Paginação
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("nome", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("[v0] Error fetching paginated products:", error);
    throw error;
  }

  return {
    data: data as DatabaseProduct[],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Busca valores distintos de marcas dos produtos
 */
export async function getDistinctMarcas(): Promise<string[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("products")
    .select("marca")
    .order("marca", { ascending: true });

  if (error) {
    console.error("[v0] Error fetching distinct marcas:", error);
    return [];
  }

  // Extrair valores únicos
  const uniqueMarcas = Array.from(new Set(data?.map((p) => p.marca) || []));
  return uniqueMarcas.filter(Boolean).sort();
}

/**
 * Busca valores distintos de tipos dos produtos
 */
export async function getDistinctTipos(): Promise<string[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("products")
    .select("tipo")
    .order("tipo", { ascending: true });

  if (error) {
    console.error("[v0] Error fetching distinct tipos:", error);
    return [];
  }

  // Extrair valores únicos
  const uniqueTipos = Array.from(new Set(data?.map((p) => p.tipo) || []));
  return uniqueTipos.filter(Boolean).sort();
}

/**
 * Busca valores distintos de categorias dos produtos
 */
export async function getDistinctCategorias(): Promise<string[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("products")
    .select("categoria")
    .order("categoria", { ascending: true });

  if (error) {
    console.error("[v0] Error fetching distinct categorias:", error);
    return [];
  }

  // Extrair valores únicos
  const uniqueCategorias = Array.from(new Set(data?.map((p) => p.categoria) || []));
  return uniqueCategorias.filter(Boolean).sort();
}


export async function createProduct(
  product: Omit<DatabaseProduct, "id" | "created_at">
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .insert([product])
    .select()
    .single();

  if (error) {
    console.error("[v0] Error creating product:", error);
    throw error;
  }

  return data as DatabaseProduct;
}

export async function updateProduct(
  id: string,
  product: Partial<DatabaseProduct>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .update(product)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[v0] Error updating product:", error);
    throw error;
  }

  return data as DatabaseProduct;
}

export async function isProductUsedInOrders(
  productId: string
): Promise<boolean> {
  const supabase = createClient();

  const { data: orderItems, error } = await supabase
    .from("order_items")
    .select("id")
    .eq("produto_id", productId)
    .limit(1);

  if (error) {
    console.error("[v0] Error checking product usage:", error);
    return false; // Em caso de erro, assumir que não está sendo usado para não bloquear
  }

  return orderItems && orderItems.length > 0;
}

/**
 * Otimização: Busca todos os IDs de produtos usados em pedidos em uma única query
 * Retorna um Map com productId -> boolean (true se usado)
 */
export async function getProductsUsageMap(): Promise<Record<string, boolean>> {
  const supabase = createClient();

  const { data: orderItems, error } = await supabase
    .from("order_items")
    .select("produto_id");

  if (error) {
    console.error("[v0] Error fetching products usage map:", error);
    return {};
  }

  // Criar um Set com IDs únicos de produtos usados
  const usedProductIds = new Set(
    orderItems?.map((item) => item.produto_id) || []
  );

  // Converter para Record<string, boolean>
  const usageMap: Record<string, boolean> = {};
  usedProductIds.forEach((id) => {
    usageMap[id] = true;
  });

  return usageMap;
}


export async function deleteProduct(id: string) {
  const supabase = createClient();

  // Verificar se o produto foi usado em algum pedido
  const { data: orderItems, error: checkError } = await supabase
    .from("order_items")
    .select("id")
    .eq("produto_id", id)
    .limit(1);

  if (checkError) {
    console.error("[v0] Error checking product usage:", checkError);
    throw checkError;
  }

  if (orderItems && orderItems.length > 0) {
    throw new Error(
      "Não é possível excluir um produto que já foi usado em pedidos anteriores. Você pode inativá-lo ao invés de excluir."
    );
  }

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    console.error("[v0] Error deleting product:", error);
    throw error;
  }
}

// Clients
export async function getClients(vendedorId?: string) {
  const supabase = createClient();
  let query = supabase
    .from("clients")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (vendedorId) {
    query = query.eq("vendedor_id", vendedorId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[v0] Error fetching clients:", error);
    throw error;
  }

  return data as DatabaseClient[];
}

export async function createNewClient(
  client: Omit<DatabaseClient, "id" | "created_at">
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert([client])
    .select()
    .single();

  if (error) {
    console.error("[v0] Error creating client:", error);
    throw error;
  }

  return data as DatabaseClient;
}

export async function updateClient(
  id: string,
  client: Partial<DatabaseClient>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .update(client)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[v0] Error updating client:", error);
    throw error;
  }

  return data as DatabaseClient;
}

// Orders
export async function getOrders(vendedorId?: string) {
  const supabase = createClient();
  let query = supabase
    .from("orders")
    .select(
      `
      *,
      order_items (*)
    `
    )
    .order("created_at", { ascending: false });

  if (vendedorId) {
    query = query.eq("vendedor_id", vendedorId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[v0] Error fetching orders:", error);
    throw error;
  }

  return data as (DatabaseOrder & { order_items: DatabaseOrderItem[] })[];
}

export async function getOrderByNumber(numero: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items (*)
    `
    )
    .eq("numero_pedido", numero)
    .single();

  if (error) {
    console.error("[v0] Error fetching order:", error);
    throw error;
  }

  return data as DatabaseOrder & { order_items: DatabaseOrderItem[] };
}

export async function createOrder(
  order: Omit<DatabaseOrder, "id" | "created_at">,
  items: Omit<DatabaseOrderItem, "id" | "order_id" | "created_at">[]
) {
  const supabase = createClient();

  // Validar que debito_carcaca de cada item seja igual à quantidade (não valor monetário)
  // debito_carcaca representa a quantidade de carcaças pendentes, não o valor monetário
  for (const item of items) {
    if (item.debito_carcaca !== item.quantidade) {
      console.warn(
        `[v0] Warning: debito_carcaca (${item.debito_carcaca}) should equal quantidade (${item.quantidade}) for item ${item.produto_nome}`
      );
      // Garantir que debito_carcaca seja igual à quantidade
      item.debito_carcaca = item.quantidade;
    }
  }

  // Insert order
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .insert([order])
    .select()
    .single();

  if (orderError) {
    console.error("[v0] Error creating order:", orderError);
    throw orderError;
  }

  // Insert order items
  const itemsWithOrderId = items.map((item) => ({
    ...item,
    order_id: orderData.id,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsWithOrderId);

  if (itemsError) {
    console.error("[v0] Error creating order items:", itemsError);
    throw itemsError;
  }

  return orderData as DatabaseOrder;
}

export async function updateOrderStatus(
  id: string,
  status: string,
  data_devolucao?: string
) {
  const supabase = createClient();
  const updateData: any = { status };

  if (data_devolucao) {
    updateData.data_devolucao = data_devolucao;
  }

  const { data, error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[v0] Error updating order:", error);
    throw error;
  }

  return data as DatabaseOrder;
}

// Statistics
export async function getVendedorStats(vendedorId: string) {
  const supabase = createClient();

  // Get order_items where debito_carcaca > 0 (pending carcacas)
  // Débito Total = soma dos valores de desconto dos itens pendentes
  // Carcaças Pendentes = soma das quantidades dos itens pendentes
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select(
      `
      quantidade,
      preco_unitario,
      desconto_percentual,
      debito_carcaca,
      orders!inner(
        vendedor_id,
        status
      )
    `
    )
    .gt("debito_carcaca", 0)
    .eq("orders.vendedor_id", vendedorId)
    .in("orders.status", ["Aguardando Devolução", "Atrasado", "Concluído"]);

  if (itemsError) {
    console.error("[v0] Error fetching vendedor stats:", itemsError);
    throw itemsError;
  }

  // Calcular Débito Total: soma dos valores de desconto
  // Valor do desconto = preco_unitario * desconto_percentual / (100 - desconto_percentual) * quantidade
  // Ou: valor_desconto = (preco_original - preco_unitario) * quantidade
  // Como preco_original = preco_unitario / (1 - desconto_percentual/100)
  // Então: valor_desconto = preco_unitario * desconto_percentual / (100 - desconto_percentual) * quantidade
  const debitoTotal =
    orderItems?.reduce((sum, item) => {
      const descontoPercentual = item.desconto_percentual || 0;
      const precoUnitario = item.preco_unitario || 0;
      const quantidade = item.quantidade || 0;

      if (descontoPercentual > 0 && descontoPercentual < 100) {
        // Calcular preço original e valor do desconto
        const precoOriginal = precoUnitario / (1 - descontoPercentual / 100);
        const valorDesconto = (precoOriginal - precoUnitario) * quantidade;
        return sum + valorDesconto;
      }
      return sum;
    }, 0) || 0;

  // Carcaças Pendentes: soma das quantidades
  const carcacasPendentes =
    orderItems?.reduce((sum, item) => sum + (item.quantidade || 0), 0) || 0;

  return {
    debitoTotal,
    carcacasPendentes,
  };
}

export async function getClientStats(clienteId: string) {
  const supabase = createClient();

  // Get order_items where debito_carcaca > 0 (pending carcacas)
  // Débito Total = soma dos valores de desconto dos itens pendentes
  // Carcaças Pendentes = soma das quantidades dos itens pendentes
  const { data: orderItems, error } = await supabase
    .from("order_items")
    .select(
      `
      quantidade,
      preco_unitario,
      desconto_percentual,
      debito_carcaca,
      orders!inner(
        cliente_id,
        status
      )
    `
    )
    .gt("debito_carcaca", 0)
    .eq("orders.cliente_id", clienteId)
    .in("orders.status", ["Aguardando Devolução", "Atrasado", "Concluído"]);

  if (error) {
    console.error("[v0] Error fetching client stats:", error);
    throw error;
  }

  // Calcular Débito Total: soma dos valores de desconto
  const debitoTotal =
    orderItems?.reduce((sum, item) => {
      const descontoPercentual = item.desconto_percentual || 0;
      const precoUnitario = item.preco_unitario || 0;
      const quantidade = item.quantidade || 0;

      if (descontoPercentual > 0 && descontoPercentual < 100) {
        // Calcular preço original e valor do desconto
        const precoOriginal = precoUnitario / (1 - descontoPercentual / 100);
        const valorDesconto = (precoOriginal - precoUnitario) * quantidade;
        return sum + valorDesconto;
      }
      return sum;
    }, 0) || 0;

  // Carcaças Pendentes: soma das quantidades
  const carcacasPendentes =
    orderItems?.reduce((sum, item) => sum + (item.quantidade || 0), 0) || 0;

  return {
    debitoTotal,
    carcacasPendentes,
  };
}

// Generate order number
export async function generateOrderNumber() {
  const supabase = createClient();

  // Get the last order number
  const { data, error } = await supabase
    .from("orders")
    .select("numero_pedido")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[v0] Error fetching last order:", error);
    // Return default if error
    return `PED-${new Date().getFullYear()}-0001`;
  }

  if (!data || data.length === 0) {
    return `PED-${new Date().getFullYear()}-0001`;
  }

  // Extract number from last order (format: PED-YYYY-NNNN)
  const lastNumber = data[0].numero_pedido;
  const parts = lastNumber.split("-");
  const year = new Date().getFullYear().toString();

  if (parts[1] === year) {
    // Same year, increment
    const num = Number.parseInt(parts[2]) + 1;
    return `PED-${year}-${num.toString().padStart(4, "0")}`;
  } else {
    // New year, start from 1
    return `PED-${year}-0001`;
  }
}

export async function generateRelatorioEntradaNumber() {
  const supabase = createClient();

  // Get the last relatório entrada number
  const { data, error } = await supabase
    .from("merchandise_entries")
    .select("numero_nota_fiscal")
    .like("numero_nota_fiscal", "REL-%")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[v0] Error fetching last relatorio entrada:", error);
    // Return default if error
    return `REL-${new Date().getFullYear()}-0001`;
  }

  if (!data || data.length === 0) {
    return `REL-${new Date().getFullYear()}-0001`;
  }

  // Extract number from last relatório (format: REL-YYYY-NNNN)
  const lastNumber = data[0].numero_nota_fiscal;
  const parts = lastNumber.split("-");
  const year = new Date().getFullYear().toString();

  if (parts[1] === year) {
    // Same year, increment
    const num = Number.parseInt(parts[2]) + 1;
    return `REL-${year}-${num.toString().padStart(4, "0")}`;
  } else {
    // New year, start from 1
    return `REL-${year}-0001`;
  }
}

// Vendedores (Profiles with role="Vendedor")
export interface DatabaseVendedor {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  debitoTotal: number;
  carcacasPendentes: number;
}

export async function getVendedores() {
  const supabase = createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, nome, email, role, ativo")
    .eq("role", "Vendedor")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error("[v0] Error fetching vendedores:", error);
    throw error;
  }

  // Get stats for each vendedor
  const vendedoresComStats = await Promise.all(
    (profiles || []).map(async (profile) => {
      const stats = await getVendedorStats(profile.id);
      return {
        id: profile.id,
        nome: profile.nome,
        email: profile.email,
        role: profile.role,
        ativo: profile.ativo,
        ...stats,
      };
    })
  );

  return vendedoresComStats as DatabaseVendedor[];
}

export async function getVendedorById(id: string) {
  const supabase = createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, nome, email, role, ativo")
    .eq("id", id)
    .eq("role", "Vendedor")
    .single();

  if (error) {
    console.error("[v0] Error fetching vendedor:", error);
    throw error;
  }

  if (!profile) {
    return null;
  }

  const stats = await getVendedorStats(profile.id);

  return {
    id: profile.id,
    nome: profile.nome,
    email: profile.email,
    role: profile.role,
    ativo: profile.ativo,
    ...stats,
  } as DatabaseVendedor;
}

// Vendedor detalhes (estatísticas detalhadas para modal)
export interface VendedorDetalhes {
  nome: string;
  totalClientes: number;
  pedidosPorStatus: Record<string, number>;
  valorCarcacasPendentes: number;
}

export async function getVendedorDetalhes(
  vendedorId: string
): Promise<VendedorDetalhes> {
  const supabase = createClient();

  // Buscar nome do vendedor
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", vendedorId)
    .single();

  if (profileError) {
    console.error("[v0] Error fetching vendedor profile:", profileError);
    throw profileError;
  }

  // Total de clientes
  const { count: totalClientes, error: clientsError } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("vendedor_id", vendedorId)
    .eq("ativo", true);

  if (clientsError) {
    console.error("[v0] Error counting clients:", clientsError);
    throw clientsError;
  }

  // Pedidos por status
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("status")
    .eq("vendedor_id", vendedorId);

  if (ordersError) {
    console.error("[v0] Error fetching orders:", ordersError);
    throw ordersError;
  }

  // Agrupar pedidos por status
  const pedidosPorStatus: Record<string, number> = {};
  if (orders) {
    orders.forEach((order) => {
      const status = order.status || "Sem Status";
      pedidosPorStatus[status] = (pedidosPorStatus[status] || 0) + 1;
    });
  }

  // Valor monetário de carcaças pendentes
  // Buscar order_items com debito_carcaca > 0 e calcular valor total
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select(
      `
      debito_carcaca,
      preco_unitario,
      orders!inner(
        vendedor_id,
        status
      )
    `
    )
    .gt("debito_carcaca", 0)
    .eq("tipo_venda", "Base de Troca")
    .eq("orders.vendedor_id", vendedorId)
    .in("orders.status", ["Aguardando Devolução", "Atrasado", "Concluído"]);

  if (itemsError) {
    console.error("[v0] Error fetching order items:", itemsError);
    throw itemsError;
  }

  // Calcular valor total: debito_carcaca * preco_unitario
  const valorCarcacasPendentes =
    orderItems?.reduce((sum, item) => {
      const valor = (item.debito_carcaca || 0) * (item.preco_unitario || 0);
      return sum + valor;
    }, 0) || 0;

  return {
    nome: profile?.nome || "Desconhecido",
    totalClientes: totalClientes || 0,
    pedidosPorStatus,
    valorCarcacasPendentes,
  };
}

// Clients with stats
export interface DatabaseClientWithStats extends DatabaseClient {
  debitoTotal: number;
  carcacasPendentes: number;
}

export async function getClientById(id: string) {
  const supabase = createClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[v0] Error fetching client:", error);
    throw error;
  }

  if (!client) {
    return null;
  }

  const stats = await getClientStats(client.id);

  return {
    ...client,
    ...stats,
  } as DatabaseClientWithStats;
}

// Users (All profiles)
export interface DatabaseUser {
  id: string;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  created_at: string;
}

export async function getUsers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.error("[v0] Error fetching users:", error);
    throw error;
  }

  return data as DatabaseUser[];
}

// Merchandise Entries
export interface DatabaseMerchandiseEntry {
  id: string;
  cliente_id: string;
  numero_nota_fiscal: string;
  data_nota: string;
  status: "Pendente" | "Concluída";
  created_by: string;
  created_at: string;
  updated_at: string;
  clients?: DatabaseClient;
  profiles?: { nome: string; email: string };
}

export interface DatabaseMerchandiseEntryItem {
  id: string;
  entry_id: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario?: number | null;
  vinculado: boolean;
  order_item_id?: string;
  created_at: string;
  products?: DatabaseProduct;
}

export interface MerchandiseEntryWithItems extends DatabaseMerchandiseEntry {
  items: DatabaseMerchandiseEntryItem[];
}

export async function createMerchandiseEntry(
  entry: Omit<DatabaseMerchandiseEntry, "id" | "created_at" | "updated_at">,
  items: (Omit<
    DatabaseMerchandiseEntryItem,
    | "id"
    | "entry_id"
    | "created_at"
    | "vinculado"
    | "preco_unitario"
  > & { order_item_id?: string })[]
) {
  const supabase = createClient();

  // Criar entrada
  const { data: entryData, error: entryError } = await supabase
    .from("merchandise_entries")
    .insert({
      cliente_id: entry.cliente_id,
      numero_nota_fiscal: entry.numero_nota_fiscal,
      data_nota: entry.data_nota,
      status: entry.status,
      created_by: entry.created_by,
    })
    .select()
    .single();

  if (entryError) {
    console.error("[v0] Error creating merchandise entry:", entryError);
    throw entryError;
  }

  // Criar itens
  if (items.length > 0) {
    // Inserir itens com vinculação se order_item_id estiver presente
    const { data: createdItems, error: itemsError } = await supabase
      .from("merchandise_entry_items")
      .insert(
        items.map((item) => ({
          entry_id: entryData.id,
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade: item.quantidade,
          // Se tem order_item_id, já marca como vinculado
          vinculado: !!item.order_item_id,
          order_item_id: item.order_item_id || null,
        }))
      )
      .select();

    if (itemsError) {
      console.error("[v0] Error creating merchandise entry items:", itemsError);
      // Tentar deletar a entrada criada
      await supabase
        .from("merchandise_entries")
        .delete()
        .eq("id", entryData.id);
      throw itemsError;
    }

    // Processar vinculação automática para itens com order_item_id
    const itemsWithOrderItemId = items.filter(item => item.order_item_id);
    
    for (const item of itemsWithOrderItemId) {
      try {
        // Buscar o order_item atual para reduzir o débito
        const { data: orderItem, error: orderItemError } = await supabase
          .from("order_items")
          .select("*, order_id")
          .eq("id", item.order_item_id)
          .single();

        if (orderItemError || !orderItem) {
          console.error(`[v0] Error fetching order_item ${item.order_item_id}:`, orderItemError);
          continue;
        }

        // Calcular novo débito (não pode ficar negativo)
        const novoDebito = Math.max(0, orderItem.debito_carcaca - item.quantidade);
        console.log(
          `[v0] Auto-linking: order_item ${item.order_item_id}, debito_carcaca ${orderItem.debito_carcaca} -> ${novoDebito} (quantidade: ${item.quantidade})`
        );

        // Atualizar o débito do order_item
        const { error: updateError } = await supabase
          .from("order_items")
          .update({ debito_carcaca: novoDebito })
          .eq("id", item.order_item_id);

        if (updateError) {
          console.error(`[v0] Error updating order_item ${item.order_item_id}:`, updateError);
          continue;
        }

        // Verificar se todos os itens do pedido foram devolvidos
        const { data: allOrderItems, error: allItemsError } = await supabase
          .from("order_items")
          .select("debito_carcaca")
          .eq("order_id", orderItem.order_id);

        if (!allItemsError && allOrderItems) {
          const todosItensDevolvidos = allOrderItems.every((i) => i.debito_carcaca === 0);

          if (todosItensDevolvidos) {
            // Atualizar status do pedido para "Concluído"
            await supabase
              .from("orders")
              .update({
                status: "Concluído",
                data_devolucao: new Date().toISOString(),
              })
              .eq("id", orderItem.order_id);
            
            console.log(`[v0] Order ${orderItem.order_id} completed - all items returned`);
          }
        }
      } catch (linkError) {
        console.error(`[v0] Error auto-linking item:`, linkError);
        // Continua com os próximos itens mesmo se um falhar
      }
    }

    // Verificar se todos os itens da entrada foram vinculados
    const todosVinculados = items.every(item => item.order_item_id);
    if (todosVinculados) {
      await supabase
        .from("merchandise_entries")
        .update({ status: "Concluída" })
        .eq("id", entryData.id);
    }
  }

  return entryData;
}

export async function getMerchandiseEntries(
  userId?: string,
  userRole?: string
) {
  const supabase = createClient();

  let query = supabase
    .from("merchandise_entries")
    .select(
      `
      *,
      clients(*),
      profiles!merchandise_entries_created_by_fkey(nome, email)
    `
    )
    .order("created_at", { ascending: false });

  // Operadores agora veem todas as entradas, não apenas as suas
  // Removido filtro: if (userRole === "operador" && userId) { query = query.eq("created_by", userId); }

  const { data, error } = await query;

  if (error) {
    console.error("[v0] Error fetching merchandise entries:", error);
    throw error;
  }

  return data as DatabaseMerchandiseEntry[];
}

export async function getMerchandiseEntryById(id: string) {
  const supabase = createClient();

  const { data: entry, error: entryError } = await supabase
    .from("merchandise_entries")
    .select(
      `
      *,
      clients(*),
      profiles!merchandise_entries_created_by_fkey(nome, email)
    `
    )
    .eq("id", id)
    .single();

  if (entryError) {
    console.error("[v0] Error fetching merchandise entry:", entryError);
    throw entryError;
  }

  const { data: items, error: itemsError } = await supabase
    .from("merchandise_entry_items")
    .select(
      `
      *,
      products(*)
    `
    )
    .eq("entry_id", id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("[v0] Error fetching merchandise entry items:", itemsError);
    throw itemsError;
  }

  return {
    ...entry,
    items: items || [],
  } as MerchandiseEntryWithItems;
}

export async function updateMerchandiseEntryStatus(
  id: string,
  status: "Pendente" | "Concluída"
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("merchandise_entries")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[v0] Error updating merchandise entry status:", error);
    throw error;
  }

  return data;
}

export async function getPendingCarcacasByCliente(clienteId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("order_items")
    .select(
      `
      *,
      orders!inner(
        id,
        numero_pedido,
        cliente_id,
        status,
        data_venda
      )
      )
    `
    )
    .eq("orders.cliente_id", clienteId)
    .gt("debito_carcaca", 0)
    .eq("tipo_venda", "Base de Troca")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[v0] Error fetching pending carcacas:", error);
    throw error;
  }

  return data || [];
}

export async function vincularEntradaComCarcacas(
  entryItemId: string,
  orderItemId: string,
  quantidade: number
) {
  const supabase = createClient();

  // Buscar o order_item atual
  const { data: orderItem, error: orderItemError } = await supabase
    .from("order_items")
    .select("*")
    .eq("id", orderItemId)
    .single();

  if (orderItemError || !orderItem) {
    console.error("[v0] Error fetching order item:", orderItemError);
    throw new Error("Item de pedido não encontrado");
  }

  // Verificar se há débito suficiente
  if (orderItem.debito_carcaca < quantidade) {
    throw new Error("Quantidade a vincular excede o débito disponível");
  }

  // Atualizar o order_item reduzindo o débito
  const novoDebito = orderItem.debito_carcaca - quantidade;
  console.log(
    `[v0] Updating order_item ${orderItemId}: debito_carcaca ${orderItem.debito_carcaca} -> ${novoDebito} (quantidade: ${quantidade})`
  );

  const { data: updatedOrderItem, error: updateOrderItemError } = await supabase
    .from("order_items")
    .update({ debito_carcaca: novoDebito })
    .eq("id", orderItemId)
    .select()
    .single();

  if (updateOrderItemError) {
    console.error("[v0] Error updating order item:", updateOrderItemError);
    throw updateOrderItemError;
  }

  console.log(`[v0] Order item updated successfully:`, updatedOrderItem);

  // Vincular o item da entrada
  const { error: linkError } = await supabase
    .from("merchandise_entry_items")
    .update({
      vinculado: true,
      order_item_id: orderItemId,
    })
    .eq("id", entryItemId);

  if (linkError) {
    console.error("[v0] Error linking entry item:", linkError);
    // Reverter a atualização do order_item
    await supabase
      .from("order_items")
      .update({ debito_carcaca: orderItem.debito_carcaca })
      .eq("id", orderItemId);
    throw linkError;
  }

  // Verificar se todos os itens do pedido foram devolvidos
  const { data: allOrderItems, error: allItemsError } = await supabase
    .from("order_items")
    .select("debito_carcaca")
    .eq("order_id", orderItem.order_id);

  if (allItemsError) {
    console.error("[v0] Error checking all order items:", allItemsError);
    // Não falhar o vínculo por causa disso
    return;
  }

  const todosItensDevolvidos =
    allOrderItems?.every((item) => item.debito_carcaca === 0) ?? false;

  if (todosItensDevolvidos) {
    // Atualizar status do pedido para "Concluído"
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        status: "Concluído",
        data_devolucao: new Date().toISOString(),
      })
      .eq("id", orderItem.order_id);

    if (updateOrderError) {
      console.error("[v0] Error updating order status:", updateOrderError);
      // Não falhar o vínculo por causa disso
    }
  }

  // Verificar se todos os itens da entrada foram vinculados
  const { data: entryItem, error: entryItemError } = await supabase
    .from("merchandise_entry_items")
    .select("entry_id")
    .eq("id", entryItemId)
    .single();

  if (entryItemError || !entryItem) {
    console.error("[v0] Error fetching entry item:", entryItemError);
    return;
  }

  const { data: allEntryItems, error: allEntryItemsError } = await supabase
    .from("merchandise_entry_items")
    .select("vinculado")
    .eq("entry_id", entryItem.entry_id);

  if (allEntryItemsError) {
    console.error("[v0] Error checking all entry items:", allEntryItemsError);
    return;
  }

  const todosItensVinculados =
    allEntryItems?.every((item) => item.vinculado === true) ?? false;

  if (todosItensVinculados) {
    // Atualizar status da entrada para "Concluída"
    await updateMerchandiseEntryStatus(entryItem.entry_id, "Concluída");
  }
}

export async function getMerchandiseEntriesWithLinks(
  userId?: string,
  userRole?: string
) {
  const supabase = createClient();

  let query = supabase
    .from("merchandise_entries")
    .select(
      `
      *,
      clients(*),
      profiles!merchandise_entries_created_by_fkey(nome, email),
      merchandise_entry_items(
        *,
        order_items:order_item_id(
          id,
          produto_nome,
          debito_carcaca,
          orders(
            id,
            numero_pedido,
            data_venda,
            status
          )
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  // Operadores agora veem todas as entradas, não apenas as suas
  // Removido filtro: if (userRole === "operador" && userId) { query = query.eq("created_by", userId); }

  const { data, error } = await query;

  if (error) {
    console.error("[v0] Error fetching merchandise entries with links:", error);
    throw error;
  }

  return data as (DatabaseMerchandiseEntry & {
    merchandise_entry_items: (DatabaseMerchandiseEntryItem & {
      order_items?: {
        id: string;
        produto_nome: string;
        debito_carcaca: number;
        orders?: {
          id: string;
          numero_pedido: string;
          data_venda: string;
          status: string;
        };
      } | null;
    })[];
  })[];
}

// Documents
export interface DatabaseEntryDocument {
  id: string;
  entry_id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  created_at: string;
}

export async function uploadEntryDocuments(
  entryId: string,
  files: File[]
): Promise<DatabaseEntryDocument[]> {
  const supabase = createClient();
  const uploadedDocs: DatabaseEntryDocument[] = [];

  for (const file of files) {
    // Sanitize filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `entries/${entryId}/${Date.now()}_${sanitizedName}`;

    try {
      // 1. Upload to Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from("documents") // Make sure this bucket is created and public
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (storageError) {
        console.error(
          `[v0] Error uploading file ${file.name}:`,
          storageError.message
        );
        continue;
      }

      // 2. Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(filePath);

      // 3. Insert into Database
      const { data: docData, error: dbError } = await supabase
        .from("merchandise_entry_items_documents")
        .insert({
          entry_id: entryId,
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
        })
        .select()
        .single();

      if (dbError) {
        console.error(
          `[v0] Error saving document metadata for ${file.name}:`,
          dbError.message
        );
        // Optional: Delete from storage if DB insert fails to keep clean
        continue;
      }

      if (docData) {
        uploadedDocs.push(docData as DatabaseEntryDocument);
      }
    } catch (error) {
      console.error(`[v0] Unexpected error handling file ${file.name}:`, error);
    }
  }

  return uploadedDocs;
}

export async function getEntryDocuments(entryId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("merchandise_entry_items_documents")
    .select("*")
    .eq("entry_id", entryId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[v0] Error fetching entry documents:", error);
    throw error;
  }

  return data as DatabaseEntryDocument[];
}
