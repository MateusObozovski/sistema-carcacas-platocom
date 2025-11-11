export type UserRole = "Patrão" | "Gerente" | "Coordenador" | "Vendedor" | "Cliente"

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: UserRole
}

export interface Cliente {
  id: string
  name: string
  vendedorId: string
  debitoTotal: number
  carcacasPendentes: number
  ultimaAtualizacao: string
}

export interface OrderItem {
  id: string
  produtoId: string
  produtoNome: string
  quantidade: number
  precoUnitario: number
  precoOriginal: number
  desconto: number
  subtotal: number
  debitoCarcaca: number
}

export interface Pedido {
  id: string
  numero: string
  clienteId: string
  vendedorId: string
  produto: string
  tipoVenda: "normal" | "base-troca"
  precoOriginal: number
  desconto: number
  precoFinal: number
  debitoCarcaca: number
  items?: OrderItem[]
  statusCarcaca: "aguardando" | "atrasado" | "devolvida" | "perda-total"
  dataCriacao: string
  dataPrevisaoDevolucao: string
  dataDevolucao?: string
  observacoes?: string
}

export interface Vendedor {
  id: string
  name: string
  debitoTotal: number
  carcacasPendentes: number
}

export interface Product {
  id: string
  name: string
  marca: string // Mercedes, Ford, Volvo, etc.
  tipo: string // Caminhões, Ônibus, etc.
  categoria: "kit" | "plato" | "mancal" | "disco" | "outros"
  aplicacao?: string // Vehicle model application
  diametro?: string // Diameter (250MM, 280MM, etc.)
  codigoFabrica?: string // Factory code
  codigoSachs?: string // Sachs code
  caracteristicas?: string // Product characteristics
  precoBase: number
  descontoMaximo: number
  ativo: boolean
  dataCriacao: string
}

export interface ProductImportRow {
  aplicacao: string
  diametro: string
  categoria: "kit" | "plato" | "mancal" | "disco"
  codigoFabrica: string
  codigoSachs: string
  preco: number
  descontoBT: number
  caracteristicas?: string
  marca: string
  tipo: string
}
