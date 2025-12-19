export type UserRole =
  | "admin"
  | "Gerente"
  | "Coordenador"
  | "Vendedor"
  | "Cliente"
  | "operador";

// Lista fixa de marcas de produtos
export const PRODUCT_MARCAS = [
  "Massey",
  "Valtra",
  "Ford",
  "New Holland",
  "John Deere",
  "Agrale",
  "Yanmar",
  "Mercedes",
  "Iveco",
  "DAF",
  "Scania",
  "Volvo",
  "Volkswagen",
] as const;

export type ProductMarca = (typeof PRODUCT_MARCAS)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface Cliente {
  id: string;
  name: string;
  vendedorId: string;
  debitoTotal: number;
  carcacasPendentes: number;
  ultimaAtualizacao: string;
}

export interface OrderItem {
  id: string;
  produtoId: string;
  produtoNome: string;
  produtoCodigo?: string; // Código do produto
  produtoCodigoFabricante?: string; // Código do fabricante
  quantidade: number;
  precoUnitario: number; // Preço de venda negociado (pode ser editado)
  precoOriginal: number; // Preço base do produto
  desconto: number; // Desconto em %
  carcassValue: number; // Valor fixo da carcaça
  maxDiscountPercent: number; // % máximo calculado dinamicamente
  retainedRevenue: number; // Valor gerado (carcassValue - descontoReal)
  subtotal: number;
  debitoCarcaca: number;
}

export interface Pedido {
  id: string;
  numero: string;
  clienteId: string;
  vendedorId: string;
  produto: string;
  tipoVenda: "normal" | "base-troca";
  precoOriginal: number;
  desconto: number;
  precoFinal: number;
  debitoCarcaca: number;
  items?: OrderItem[];
  statusCarcaca: "aguardando" | "atrasado" | "devolvida" | "perda-total";
  dataCriacao: string;
  dataPrevisaoDevolucao: string;
  dataDevolucao?: string;
  observacoes?: string;
}

export interface Vendedor {
  id: string;
  name: string;
  debitoTotal: number;
  carcacasPendentes: number;
}

export interface Product {
  id: string;
  name: string;
  marca: string; // Mercedes, Ford, Volvo, etc.
  tipo: string; // Caminhões, Ônibus, etc.
  categoria: "kit" | "plato" | "mancal" | "disco" | "outros";
  aplicacao?: string; // Vehicle model application
  diametro?: string; // Diameter (250MM, 280MM, etc.)
  codigoFabrica?: string; // Factory code
  codigoSachs?: string; // Sachs code
  caracteristicas?: string; // Product characteristics
  precoBase: number;
  descontoMaximo: number;
  ativo: boolean;
  dataCriacao: string;
}

export interface ProductImportRow {
  aplicacao: string;
  diametro: string;
  categoria: "kit" | "plato" | "mancal" | "disco";
  codigoFabrica: string;
  codigoSachs: string;
  preco: number;
  descontoBT: number;
  caracteristicas?: string;
  marca: string;
  tipo: string;
}
