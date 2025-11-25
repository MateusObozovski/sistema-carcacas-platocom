import { createClient } from "@/lib/supabase/client"

export interface DatabaseProduct {
  id: string
  nome: string
  marca: string
  tipo: string
  categoria: string
  aplicacao?: string
  diametro?: string
  codigo_fabrica?: string
  codigo_sachs?: string
  preco_base: number
  desconto_maximo_bt: number
  ativo: boolean
  created_at: string
}

export interface DatabaseClient {
  id: string
  nome: string
  cnpj?: string
  telefone?: string
  email?: string
  endereco?: string
  vendedor_id: string
  ativo: boolean
  created_at: string
}

export interface DatabaseOrder {
  id: string
  numero_pedido: string
  cliente_id: string
  vendedor_id: string
  tipo_venda: string
  valor_total: number
  debito_carcaca: number
  status: string
  data_venda: string
  data_devolucao?: string
  observacoes?: string
  numero_pedido_origem?: string
  empresa?: "Platocom" | "R.D.C" | "Rita de Cássia" | "Tork" | "Thiago"
  created_at: string
}

export interface DatabaseOrderItem {
  id: string
  order_id: string
  produto_id: string
  produto_nome: string
  quantidade: number
  preco_unitario: number
  desconto_percentual: number
  preco_final: number
  debito_carcaca: number
  tipo_venda: string
}

// Products
export async function getProducts() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching products:", error)
    throw error
  }

  return data as DatabaseProduct[]
}

export async function getAllProducts() {
  const supabase = createClient()
  const { data, error } = await supabase.from("products").select("*").order("nome", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching all products:", error)
    throw error
  }

  return data as DatabaseProduct[]
}

export async function createProduct(product: Omit<DatabaseProduct, "id" | "created_at">) {
  const supabase = createClient()
  const { data, error } = await supabase.from("products").insert([product]).select().single()

  if (error) {
    console.error("[v0] Error creating product:", error)
    throw error
  }

  return data as DatabaseProduct
}

export async function updateProduct(id: string, product: Partial<DatabaseProduct>) {
  const supabase = createClient()
  const { data, error } = await supabase.from("products").update(product).eq("id", id).select().single()

  if (error) {
    console.error("[v0] Error updating product:", error)
    throw error
  }

  return data as DatabaseProduct
}

export async function deleteProduct(id: string) {
  const supabase = createClient()
  
  // Verificar se o produto foi usado em algum pedido
  const { data: orderItems, error: checkError } = await supabase
    .from("order_items")
    .select("id")
    .eq("produto_id", id)
    .limit(1)

  if (checkError) {
    console.error("[v0] Error checking product usage:", checkError)
    throw checkError
  }

  if (orderItems && orderItems.length > 0) {
    throw new Error("Não é possível excluir um produto que já foi usado em pedidos anteriores")
  }

  const { error } = await supabase.from("products").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting product:", error)
    throw error
  }
}

// Clients
export async function getClients(vendedorId?: string) {
  const supabase = createClient()
  let query = supabase.from("clients").select("*").eq("ativo", true).order("nome", { ascending: true })

  if (vendedorId) {
    query = query.eq("vendedor_id", vendedorId)
  }

  const { data, error } = await query

  if (error) {
    console.error("[v0] Error fetching clients:", error)
    throw error
  }

  return data as DatabaseClient[]
}

export async function createNewClient(client: Omit<DatabaseClient, "id" | "created_at">) {
  const supabase = createClient()
  const { data, error } = await supabase.from("clients").insert([client]).select().single()

  if (error) {
    console.error("[v0] Error creating client:", error)
    throw error
  }

  return data as DatabaseClient
}

export async function updateClient(id: string, client: Partial<DatabaseClient>) {
  const supabase = createClient()
  const { data, error } = await supabase.from("clients").update(client).eq("id", id).select().single()

  if (error) {
    console.error("[v0] Error updating client:", error)
    throw error
  }

  return data as DatabaseClient
}

// Orders
export async function getOrders(vendedorId?: string) {
  const supabase = createClient()
  let query = supabase
    .from("orders")
    .select(`
      *,
      order_items (*)
    `)
    .order("created_at", { ascending: false })

  if (vendedorId) {
    query = query.eq("vendedor_id", vendedorId)
  }

  const { data, error } = await query

  if (error) {
    console.error("[v0] Error fetching orders:", error)
    throw error
  }

  return data as (DatabaseOrder & { order_items: DatabaseOrderItem[] })[]
}

export async function getOrderByNumber(numero: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (*)
    `)
    .eq("numero_pedido", numero)
    .single()

  if (error) {
    console.error("[v0] Error fetching order:", error)
    throw error
  }

  return data as DatabaseOrder & { order_items: DatabaseOrderItem[] }
}

export async function createOrder(
  order: Omit<DatabaseOrder, "id" | "created_at">,
  items: Omit<DatabaseOrderItem, "id" | "order_id" | "created_at">[],
) {
  const supabase = createClient()

  // Insert order
  const { data: orderData, error: orderError } = await supabase.from("orders").insert([order]).select().single()

  if (orderError) {
    console.error("[v0] Error creating order:", orderError)
    throw orderError
  }

  // Insert order items
  const itemsWithOrderId = items.map((item) => ({
    ...item,
    order_id: orderData.id,
  }))

  const { error: itemsError } = await supabase.from("order_items").insert(itemsWithOrderId)

  if (itemsError) {
    console.error("[v0] Error creating order items:", itemsError)
    throw itemsError
  }

  return orderData as DatabaseOrder
}

export async function updateOrderStatus(id: string, status: string, data_devolucao?: string) {
  const supabase = createClient()
  const updateData: any = { status }

  if (data_devolucao) {
    updateData.data_devolucao = data_devolucao
  }

  const { data, error } = await supabase.from("orders").update(updateData).eq("id", id).select().single()

  if (error) {
    console.error("[v0] Error updating order:", error)
    throw error
  }

  return data as DatabaseOrder
}

// Statistics
export async function getVendedorStats(vendedorId: string) {
  const supabase = createClient()

  // Get total debito from order_items where debito_carcaca > 0
  // This represents pending carcacas
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select(`
      debito_carcaca,
      orders!inner(
        vendedor_id,
        status
      )
    `)
    .gt("debito_carcaca", 0)
    .eq("orders.vendedor_id", vendedorId)
    .in("orders.status", ["Aguardando Devolução", "Atrasado"])

  if (itemsError) {
    console.error("[v0] Error fetching vendedor stats:", itemsError)
    throw itemsError
  }

  const debitoTotal = orderItems?.reduce((sum, item) => sum + (item.debito_carcaca || 0), 0) || 0
  const carcacasPendentes = orderItems?.length || 0

  return {
    debitoTotal,
    carcacasPendentes,
  }
}

export async function getClientStats(clienteId: string) {
  const supabase = createClient()

  // Get total debito from order_items where debito_carcaca > 0
  const { data: orderItems, error } = await supabase
    .from("order_items")
    .select(`
      debito_carcaca,
      orders!inner(
        cliente_id,
        status
      )
    `)
    .gt("debito_carcaca", 0)
    .eq("orders.cliente_id", clienteId)
    .in("orders.status", ["Aguardando Devolução", "Atrasado"])

  if (error) {
    console.error("[v0] Error fetching client stats:", error)
    throw error
  }

  const debitoTotal = orderItems?.reduce((sum, item) => sum + (item.debito_carcaca || 0), 0) || 0
  const carcacasPendentes = orderItems?.length || 0

  return {
    debitoTotal,
    carcacasPendentes,
  }
}

// Generate order number
export async function generateOrderNumber() {
  const supabase = createClient()

  // Get the last order number
  const { data, error } = await supabase
    .from("orders")
    .select("numero_pedido")
    .order("created_at", { ascending: false })
    .limit(1)

  if (error) {
    console.error("[v0] Error fetching last order:", error)
    // Return default if error
    return `PED-${new Date().getFullYear()}-0001`
  }

  if (!data || data.length === 0) {
    return `PED-${new Date().getFullYear()}-0001`
  }

  // Extract number from last order (format: PED-YYYY-NNNN)
  const lastNumber = data[0].numero_pedido
  const parts = lastNumber.split("-")
  const year = new Date().getFullYear().toString()

  if (parts[1] === year) {
    // Same year, increment
    const num = Number.parseInt(parts[2]) + 1
    return `PED-${year}-${num.toString().padStart(4, "0")}`
  } else {
    // New year, start from 1
    return `PED-${year}-0001`
  }
}

// Vendedores (Profiles with role="Vendedor")
export interface DatabaseVendedor {
  id: string
  nome: string
  email: string
  role: string
  ativo: boolean
  debitoTotal: number
  carcacasPendentes: number
}

export async function getVendedores() {
  const supabase = createClient()
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, nome, email, role, ativo")
    .eq("role", "Vendedor")
    .eq("ativo", true)
    .order("nome", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching vendedores:", error)
    throw error
  }

  // Get stats for each vendedor
  const vendedoresComStats = await Promise.all(
    (profiles || []).map(async (profile) => {
      const stats = await getVendedorStats(profile.id)
      return {
        id: profile.id,
        nome: profile.nome,
        email: profile.email,
        role: profile.role,
        ativo: profile.ativo,
        ...stats,
      }
    }),
  )

  return vendedoresComStats as DatabaseVendedor[]
}

export async function getVendedorById(id: string) {
  const supabase = createClient()
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, nome, email, role, ativo")
    .eq("id", id)
    .eq("role", "Vendedor")
    .single()

  if (error) {
    console.error("[v0] Error fetching vendedor:", error)
    throw error
  }

  if (!profile) {
    return null
  }

  const stats = await getVendedorStats(profile.id)

  return {
    id: profile.id,
    nome: profile.nome,
    email: profile.email,
    role: profile.role,
    ativo: profile.ativo,
    ...stats,
  } as DatabaseVendedor
}

// Clients with stats
export interface DatabaseClientWithStats extends DatabaseClient {
  debitoTotal: number
  carcacasPendentes: number
}

export async function getClientById(id: string) {
  const supabase = createClient()
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("[v0] Error fetching client:", error)
    throw error
  }

  if (!client) {
    return null
  }

  const stats = await getClientStats(client.id)

  return {
    ...client,
    ...stats,
  } as DatabaseClientWithStats
}

// Users (All profiles)
export interface DatabaseUser {
  id: string
  nome: string
  email: string
  role: string
  ativo: boolean
  created_at: string
}

export async function getUsers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("nome", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching users:", error)
    throw error
  }

  return data as DatabaseUser[]
}
