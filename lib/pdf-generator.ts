import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// Cores da marca (convertidas para RGB para jsPDF)
const BRAND_BLUE = "#1B3A57" // RGB: 27, 58, 87
const BRAND_ORANGE = "#F08226" // RGB: 240, 130, 38
const GRAY_LIGHT = "#f3f4f6" // RGB: 243, 244, 246
const GRAY_TEXT = "#71717a" // RGB: 113, 113, 122

// Função auxiliar para converter hex para RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0]
}

// Margens do documento
const MARGIN_LEFT = 20
const MARGIN_RIGHT = 20
const MARGIN_TOP = 15
const MARGIN_BOTTOM = 15

// Especificações da logo (compacta e nítida)
const LOGO_WIDTH = 35 // mm
const LOGO_HEIGHT = 12 // mm
const LOGO_X = 14 // mm (margem esquerda)
const LOGO_Y = 10 // mm (margem topo)

// Especificações do título e metadados (alinhamento à direita)
const TITLE_X = 196 // mm (A4 width - margem direita)
const TITLE_Y = 15 // mm
const DATE_Y = 20 // mm

// Linha divisória
const DIVIDER_Y = 25 // mm
const DIVIDER_X_START = 14 // mm
const DIVIDER_X_END = 196 // mm

/**
 * Adiciona cabeçalho ao PDF com logo, título e data de emissão
 * Layout corporativo: Logo compacta à esquerda, texto alinhado à direita
 */
export async function addHeader(doc: jsPDF, title: string): Promise<void> {
  try {
    // Tentar carregar logo (tentar ambos os caminhos possíveis)
    let logoImg: string
    try {
      logoImg = await loadImage("/logo-semfundo.png")
    } catch {
      logoImg = await loadImage("/logo-sem-fundo.png")
    }
    
    // Adicionar logo compacta no canto superior esquerdo (35mm x 12mm)
    doc.addImage(logoImg, "PNG", LOGO_X, LOGO_Y, LOGO_WIDTH, LOGO_HEIGHT)
    
  } catch (error) {
    console.error("[PDF] Erro ao carregar logo, continuando sem logo:", error)
    // Continuar sem logo - não é crítico
  }
  
  // Adicionar título principal alinhado à direita
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  const brandBlueRgb = hexToRgb(BRAND_BLUE)
  doc.setTextColor(brandBlueRgb[0], brandBlueRgb[1], brandBlueRgb[2])
  doc.text(title, TITLE_X, TITLE_Y, { align: "right" })
  
  // Adicionar data de emissão abaixo do título, alinhada à direita
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  const grayTextRgb = hexToRgb(GRAY_TEXT)
  doc.setTextColor(grayTextRgb[0], grayTextRgb[1], grayTextRgb[2])
  const dataEmissao = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
  doc.text(`Emitido em: ${dataEmissao}`, TITLE_X, DATE_Y, { align: "right" })
  
  // Linha divisória horizontal na cor laranja
  const brandOrangeRgb = hexToRgb(BRAND_ORANGE)
  doc.setDrawColor(brandOrangeRgb[0], brandOrangeRgb[1], brandOrangeRgb[2])
  doc.setLineWidth(0.5)
  doc.line(DIVIDER_X_START, DIVIDER_Y, DIVIDER_X_END, DIVIDER_Y)
  
  // Resetar cor do texto e fonte para preto
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "normal")
}

/**
 * Carrega uma imagem e retorna como base64
 */
function loadImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Não foi possível criar contexto do canvas"))
        return
      }
      ctx.drawImage(img, 0, 0)
      const dataURL = canvas.toDataURL("image/png")
      resolve(dataURL)
    }
    img.onerror = () => reject(new Error(`Erro ao carregar imagem: ${src}`))
    img.src = src
  })
}

/**
 * Adiciona rodapé ao PDF com numeração de páginas
 */
export function addFooter(doc: jsPDF, pageNumber: number, totalPages: number): void {
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  
  // Numeração de páginas
  const footerText = `Página ${pageNumber} de ${totalPages}`
  doc.text(footerText, pageWidth / 2, pageHeight - MARGIN_BOTTOM + 5, { align: "center" })
  
  // Informações da empresa (opcional)
  const empresaText = "Platocom - Sistema de Carcaças"
  doc.text(empresaText, pageWidth - MARGIN_RIGHT, pageHeight - MARGIN_BOTTOM + 5, {
    align: "right",
  })
  
  doc.setTextColor(0, 0, 0)
}

/**
 * Formata valor monetário em R$
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

/**
 * Formata data em pt-BR
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Formata data e hora em pt-BR
 */
export function formatDateTime(dateString: string | Date): string {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Configurações padrão para tabelas
 */
export function getDefaultTableStyles() {
  return {
    headStyles: {
      fillColor: hexToRgb(BRAND_BLUE),
      textColor: 255,
      fontStyle: "bold" as const,
      fontSize: 10,
    },
    bodyStyles: {
      textColor: 0,
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: GRAY_LIGHT,
    },
    margin: { top: DIVIDER_Y + 8, left: MARGIN_LEFT, right: MARGIN_RIGHT },
    styles: {
      cellPadding: 3,
      fontSize: 9,
    },
    theme: "striped" as const,
  }
}

/**
 * Exporta o PDF com nome de arquivo
 */
export function savePDF(doc: jsPDF, filename: string): void {
  doc.save(filename)
}

/**
 * Gera PDF de um pedido individual para o portal do cliente
 */
export async function generateOrderPDF(order: {
  numero_pedido: string
  data_venda: string
  status: string
  valor_total: number
  tipo_venda: string
  observacoes?: string
  cliente_nome?: string
  order_items: Array<{
    produto_nome: string
    quantidade: number
    preco_unitario: number
    preco_final: number
    debito_carcaca: number
    tipo_venda: string
  }>
}): Promise<void> {
  const doc = new jsPDF()

  // Adicionar cabeçalho
  await addHeader(doc, `Pedido ${order.numero_pedido}`)

  const startY = 35

  // Informações do pedido
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Dados do Pedido", MARGIN_LEFT, startY)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)

  const infoY = startY + 6
  const lineHeight = 5

  doc.text(`Número: ${order.numero_pedido}`, MARGIN_LEFT, infoY)
  doc.text(`Data: ${formatDate(order.data_venda)}`, MARGIN_LEFT, infoY + lineHeight)
  doc.text(`Tipo: ${order.tipo_venda === "Base de Troca" ? "Base de Troca" : "Normal"}`, MARGIN_LEFT, infoY + lineHeight * 2)
  doc.text(`Status: ${order.status}`, MARGIN_LEFT, infoY + lineHeight * 3)

  if (order.cliente_nome) {
    doc.text(`Cliente: ${order.cliente_nome}`, MARGIN_LEFT + 80, infoY)
  }

  // Tabela de itens
  const tableStartY = infoY + lineHeight * 5

  const tableData = order.order_items.map(item => [
    item.produto_nome,
    item.quantidade.toString(),
    formatCurrency(item.preco_unitario),
    formatCurrency(item.preco_final),
    formatCurrency(item.preco_final * item.quantidade),
    item.debito_carcaca > 0 ? `${item.debito_carcaca} pendente(s)` : "Devolvida"
  ])

  autoTable(doc, {
    startY: tableStartY,
    head: [["Produto", "Qtd", "Preço Unit.", "Preço Final", "Subtotal", "Carcaça"]],
    body: tableData,
    ...getDefaultTableStyles(),
    margin: { top: tableStartY, left: MARGIN_LEFT, right: MARGIN_RIGHT },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 30, halign: "center" },
    },
  })

  // Totais
  const finalY = (doc as any).lastAutoTable.finalY + 10

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(`Valor Total: ${formatCurrency(order.valor_total)}`, MARGIN_LEFT + 120, finalY)

  // Carcaças pendentes
  const carcacasPendentes = order.order_items.reduce((sum, item) => sum + item.debito_carcaca, 0)
  if (carcacasPendentes > 0) {
    doc.setTextColor(220, 38, 38) // vermelho
    doc.text(`Carcaças Pendentes: ${carcacasPendentes}`, MARGIN_LEFT, finalY)
    doc.setTextColor(0, 0, 0)
  }

  // Observações
  if (order.observacoes) {
    const obsY = finalY + 15
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("Observações:", MARGIN_LEFT, obsY)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)

    const splitObs = doc.splitTextToSize(order.observacoes, 170)
    doc.text(splitObs, MARGIN_LEFT, obsY + 5)
  }

  // Adicionar rodapé
  addFooter(doc, 1, 1)

  // Salvar PDF
  savePDF(doc, `pedido-${order.numero_pedido}.pdf`)
}

