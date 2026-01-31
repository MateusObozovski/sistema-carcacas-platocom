import { z } from "zod"
import { PRODUCT_MARCAS } from "@/lib/types"

// Schema para criação de perfil
export const createProfileSchema = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
  email: z.string().email("Email inválido").toLowerCase().trim(),
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .trim(),
  role: z.enum(["admin", "Gerente", "Coordenador", "Vendedor"], {
    errorMap: () => ({ message: "Role inválida" }),
  }),
})

// Schema para criação de cliente
export const createClientSchema = z.object({
  nome: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(200, "Nome deve ter no máximo 200 caracteres")
    .trim(),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, "CNPJ inválido")
    .optional()
    .or(z.literal("")),
  telefone: z
    .string()
    .regex(/^[\d\s\(\)\-\+]+$/, "Telefone inválido")
    .max(20, "Telefone muito longo")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  endereco: z.string().max(500, "Endereço muito longo").optional().or(z.literal("")),
  vendedor_id: z.string().uuid("ID de vendedor inválido"),
  ativo: z.boolean().default(true),
})

// Schema para criação de produto
export const createProductSchema = z.object({
  nome: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(200, "Nome deve ter no máximo 200 caracteres")
    .trim(),
  marca: z.enum([...PRODUCT_MARCAS] as [string, ...string[]], {
    errorMap: () => ({ message: "Marca inválida. Selecione uma marca da lista." }),
  }),
  tipo: z.string().min(1, "Tipo é obrigatório").max(100).trim(),
  categoria: z.enum(["kit", "plato", "mancal", "disco", "outros"]),
  preco_base: z.number().positive("Preço deve ser positivo").max(999999.99),
  desconto_maximo_bt: z.number().min(0).max(100, "Desconto máximo é 100%"),
  ativo: z.boolean().default(true),
})

// Schema para criação de pedido
export const createOrderSchema = z.object({
  numero_pedido: z.string().min(1, "Número do pedido é obrigatório"),
  cliente_id: z.string().uuid("ID de cliente inválido"),
  vendedor_id: z.string().uuid("ID de vendedor inválido"),
  tipo_venda: z.enum(["Normal", "Base de Troca"]),
  valor_total: z.number().min(0, "Valor total deve ser positivo"),
  debito_carcaca: z.number().min(0, "Débito de carcaça deve ser positivo"),
  status: z.enum(["Aguardando Devolução", "Concluído", "Atrasado", "Perda Total"]),
  data_venda: z.string().datetime("Data de venda inválida"),
  observacoes: z.string().max(1000, "Observações muito longas").optional(),
  numero_pedido_origem: z.string().max(100).optional(),
  empresa: z.enum(["Platocom", "R.D.C", "Rita de Cássia", "Tork", "Thiago"]).optional(),
})

// Schema para item de pedido
export const createOrderItemSchema = z.object({
  produto_id: z.string().uuid("ID de produto inválido"),
  produto_nome: z.string().min(1, "Nome do produto é obrigatório"),
  quantidade: z.number().int().positive("Quantidade deve ser positiva"),
  preco_unitario: z.number().positive("Preço unitário deve ser positivo"),
  desconto_percentual: z.number().min(0).max(100),
  preco_final: z.number().positive("Preço final deve ser positivo"),
  debito_carcaca: z.number().min(0),
  tipo_venda: z.enum(["Normal", "Base de Troca"]),
})

// Schema para atualização de status de pedido
export const updateOrderStatusSchema = z.object({
  status: z.enum(["Aguardando Devolução", "Concluído", "Atrasado", "Perda Total"]),
  data_devolucao: z.string().datetime().optional(),
})

// Schema para busca de pedido
export const searchOrderSchema = z.object({
  numeroPedido: z.string().min(1, "Número do pedido é obrigatório").max(50),
})

// Função helper para sanitizar strings (remover scripts e HTML perigoso)
export function sanitizeString(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim()
}

// Função helper para validar e sanitizar
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const validated = schema.parse(data)
  // Aplicar sanitização em strings
  if (typeof validated === "object" && validated !== null) {
    const validatedObj = validated as Record<string, unknown>
    Object.keys(validatedObj).forEach((key) => {
      const value = validatedObj[key]
      if (typeof value === "string") {
        validatedObj[key] = sanitizeString(value)
      }
    })
  }
  return validated
}

// Schema para criação de fornecedor
export const createSupplierSchema = z.object({
  nome: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(200, "Nome deve ter no máximo 200 caracteres")
    .trim(),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, "CNPJ inválido")
    .optional()
    .or(z.literal("")),
  telefone: z
    .string()
    .regex(/^[\d\s\(\)\-\+]+$/, "Telefone inválido")
    .max(20, "Telefone muito longo")
    .optional()
    .or(z.literal("")),
  celular: z
    .string()
    .regex(/^[\d\s\(\)\-\+]+$/, "Celular inválido")
    .max(20, "Celular muito longo")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  endereco: z.string().max(500, "Endereço muito longo").optional().or(z.literal("")),
  observacoes: z.string().max(1000, "Observações muito longas").optional().or(z.literal("")),
  ativo: z.boolean().default(true),
})

// Schema para criação de nota fiscal de compra
export const createPurchaseInvoiceSchema = z.object({
  supplier_id: z.string().uuid("ID de fornecedor inválido"),
  numero_nota: z
    .string()
    .min(1, "Número da nota é obrigatório")
    .max(50, "Número da nota muito longo")
    .trim(),
  data_nota: z.string().min(1, "Data da nota é obrigatória"),
  data_vencimento: z.string().min(1, "Data de vencimento é obrigatória"),
  observacoes: z.string().max(1000, "Observações muito longas").optional().or(z.literal("")),
  created_by: z.string().uuid("ID de usuário inválido"),
})

// Schema para item de nota fiscal de compra
export const createPurchaseInvoiceItemSchema = z.object({
  produto_id: z.string().uuid("ID de produto inválido").optional().or(z.literal("")),
  descricao: z
    .string()
    .min(1, "Descrição é obrigatória")
    .max(500, "Descrição muito longa")
    .trim(),
  quantidade: z.number().int().positive("Quantidade deve ser positiva"),
  valor_unitario: z.number().positive("Valor unitário deve ser positivo"),
  valor_total: z.number().positive("Valor total deve ser positivo"),
})

// Schema para atualização de status de nota fiscal
export const updatePurchaseInvoiceStatusSchema = z.object({
  status: z.enum(["Pendente", "Pago", "Vencido"]),
  data_pagamento: z.string().optional(),
  forma_pagamento: z.string().max(100, "Forma de pagamento muito longa").optional(),
})

