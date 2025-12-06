import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  addHeader,
  addFooter,
  formatCurrency,
  formatDate,
  formatDateTime,
  getDefaultTableStyles,
  savePDF,
} from "./pdf-generator"

// Cores da marca
const BRAND_BLUE = "#1e40af"
const BRAND_ORANGE = "#f97316"

interface FilterOptions {
  dataInicio?: Date | null
  dataFim?: Date | null
  vendedorFiltro?: string
  periodoFiltro?: string
}

interface OrderWithItems {
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
  order_items?: Array<{
    id: string
    produto_nome: string
    quantidade: number
    preco_unitario: number
    desconto_percentual: number
    preco_final: number
    debito_carcaca: number
    tipo_venda: string
  }>
}

interface Cliente {
  id: string
  nome: string
  cnpj?: string
  email?: string
  telefone?: string
  endereco?: string
}

interface Vendedor {
  id: string
  nome: string
  email?: string
}

/**
 * Filtra pedidos por período e vendedor
 */
function filterOrders(
  orders: OrderWithItems[],
  filters: FilterOptions,
  clients: Cliente[],
  vendedores: Vendedor[],
): OrderWithItems[] {
  return orders.filter((order) => {
    // Filtro de vendedor
    if (filters.vendedorFiltro && filters.vendedorFiltro !== "todos") {
      if (order.vendedor_id !== filters.vendedorFiltro) return false
    }

    // Filtro de data
    const dataVenda = new Date(order.data_venda)
    
    if (filters.dataInicio) {
      const inicio = new Date(filters.dataInicio)
      inicio.setHours(0, 0, 0, 0)
      if (dataVenda < inicio) return false
    }

    if (filters.dataFim) {
      const fim = new Date(filters.dataFim)
      fim.setHours(23, 59, 59, 999)
      if (dataVenda > fim) return false
    }

    // Se não há filtros de data específicos, usar período pré-definido
    if (!filters.dataInicio && !filters.dataFim && filters.periodoFiltro) {
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - dataVenda.getTime()) / (1000 * 60 * 60 * 24))
      
      switch (filters.periodoFiltro) {
        case "7dias":
          if (diffDays > 7) return false
          break
        case "30dias":
          if (diffDays > 30) return false
          break
        case "90dias":
          if (diffDays > 90) return false
          break
        case "todos":
          // Não filtrar por período
          break
      }
    }

    return true
  })
}

/**
 * Calcula dias pendentes desde a data de venda
 */
function getDaysPending(dataVenda: string): number {
  const created = new Date(dataVenda)
  const now = new Date()
  const diff = now.getTime() - created.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

/**
 * Calcula valor do desconto de um item
 */
function calculateDescontoValue(item: {
  preco_unitario: number
  desconto_percentual: number
  quantidade: number
}): number {
  const descontoPercentual = item.desconto_percentual || 0
  const precoUnitario = item.preco_unitario || 0
  const quantidade = item.quantidade || 0

  if (descontoPercentual > 0 && descontoPercentual < 100) {
    const precoOriginal = precoUnitario / (1 - descontoPercentual / 100)
    const valorDesconto = (precoOriginal - precoUnitario) * quantidade
    return valorDesconto
  }
  return 0
}

/**
 * Gera relatório de Vendas Completo
 */
export async function generateVendasCompletoPDF(
  orders: OrderWithItems[],
  filters: FilterOptions,
  clients: Cliente[],
  vendedores: Vendedor[],
): Promise<void> {
  try {
    // Filtrar pedidos com base nos filtros (sem restrição de status)
    const pedidosFiltrados = filterOrders(orders, filters, clients, vendedores)

    if (pedidosFiltrados.length === 0) {
      throw new Error("Não há vendas no período selecionado")
    }

    const doc = new jsPDF("portrait", "mm", "a4")
    await addHeader(doc, "Relatório de Vendas Completo")

    // Preparar dados da tabela
    const tableData = pedidosFiltrados.map((pedido) => {
      const cliente = clients.find((c) => c.id === pedido.cliente_id)
      const vendedor = vendedores.find((v) => v.id === pedido.vendedor_id)

      return [
        pedido.numero_pedido,
        cliente?.nome || "-",
        vendedor?.nome || "-",
        formatDate(pedido.data_venda),
        formatCurrency(pedido.valor_total || 0),
        pedido.status,
      ]
    })

    // Calcular totais
    const valorTotal = pedidosFiltrados.reduce((sum, p) => sum + (p.valor_total || 0), 0)

    // Adicionar tabela
    autoTable(doc, {
      ...getDefaultTableStyles(),
      head: [["Pedido", "Cliente", "Vendedor", "Data", "Valor Total", "Status"]],
      body: tableData,
      foot: [
        [
          "TOTAL",
          "",
          "",
          `${pedidosFiltrados.length} pedidos`,
          formatCurrency(valorTotal),
          "",
        ],
      ],
      footStyles: {
        fillColor: BRAND_ORANGE,
        textColor: 255,
        fontStyle: "bold",
      },
    })

    // Adicionar rodapé
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      addFooter(doc, i, totalPages)
    }

    // Salvar PDF
    const periodoText = filters.dataInicio && filters.dataFim
      ? `${formatDate(filters.dataInicio)}_${formatDate(filters.dataFim)}`
      : filters.periodoFiltro || "todos"
    savePDF(doc, `Relatorio_Vendas_Completo_${periodoText}.pdf`)
  } catch (error: any) {
    console.error("[PDF] Erro ao gerar relatório de vendas:", error)
    throw error
  }
}

/**
 * Gera relatório de Carcaças Pendentes
 */
export async function generateCarcacasPendentesPDF(
  orders: OrderWithItems[],
  filters: FilterOptions,
  clients: Cliente[],
  vendedores: Vendedor[],
): Promise<void> {
  try {
    // Filtrar pedidos e extrair order_items pendentes
    const pedidosFiltrados = filterOrders(orders, filters, clients, vendedores).filter(
      (p) =>
        p.tipo_venda === "Base de Troca" &&
        (p.status === "Aguardando Devolução" || p.status === "Atrasado" || p.status === "Concluído"),
    )

    // Extrair todos os itens pendentes linha a linha
    const itensPendentes: Array<{
      pedido: string
      cliente: string
      produto: string
      quantidade: number
      valorDesconto: number
      diasPendente: number
    }> = []

    pedidosFiltrados.forEach((pedido) => {
      if (!pedido.order_items) return

      pedido.order_items
        .filter((item) => item.debito_carcaca > 0 && item.tipo_venda === "Base de Troca")
        .forEach((item) => {
          const cliente = clients.find((c) => c.id === pedido.cliente_id)
          const valorDesconto = calculateDescontoValue(item)
          const diasPendente = getDaysPending(pedido.data_venda)

          itensPendentes.push({
            pedido: pedido.numero_pedido,
            cliente: cliente?.nome || "-",
            produto: item.produto_nome,
            quantidade: item.quantidade,
            valorDesconto,
            diasPendente,
          })
        })
    })

    if (itensPendentes.length === 0) {
      throw new Error("Não há carcaças pendentes no período selecionado")
    }

    const doc = new jsPDF("portrait", "mm", "a4")
    await addHeader(doc, "Relatório de Carcaças Pendentes")

    // Preparar dados da tabela
    const tableData = itensPendentes.map((item) => [
      item.pedido,
      item.cliente,
      item.produto,
      item.quantidade.toString(),
      formatCurrency(item.valorDesconto),
      `${item.diasPendente} dias`,
    ])

    // Calcular totais
    const totalQuantidade = itensPendentes.reduce((sum, item) => sum + item.quantidade, 0)
    const totalValorDesconto = itensPendentes.reduce((sum, item) => sum + item.valorDesconto, 0)

    // Adicionar tabela
    autoTable(doc, {
      ...getDefaultTableStyles(),
      head: [["Pedido", "Cliente", "Produto", "Qtd Pendente", "Valor Desconto", "Dias Pendente"]],
      body: tableData,
      foot: [
        [
          "TOTAL",
          "",
          "",
          totalQuantidade.toString(),
          formatCurrency(totalValorDesconto),
          "",
        ],
      ],
      footStyles: {
        fillColor: BRAND_ORANGE,
        textColor: 255,
        fontStyle: "bold",
      },
    })

    // Adicionar rodapé
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      addFooter(doc, i, totalPages)
    }

    // Salvar PDF
    const periodoText = filters.dataInicio && filters.dataFim
      ? `${formatDate(filters.dataInicio)}_${formatDate(filters.dataFim)}`
      : filters.periodoFiltro || "todos"
    savePDF(doc, `Relatorio_Carcacas_Pendentes_${periodoText}.pdf`)
  } catch (error: any) {
    console.error("[PDF] Erro ao gerar relatório de carcaças pendentes:", error)
    throw error
  }
}

/**
 * Gera relatório de Pedidos Pendentes
 */
export async function generatePedidosPendentesPDF(
  orders: OrderWithItems[],
  filters: FilterOptions,
  clients: Cliente[],
  vendedores: Vendedor[],
): Promise<void> {
  try {
    // Filtrar pedidos com status "Aguardando Devolução" ou "Atrasado"
    const pedidosFiltrados = filterOrders(orders, filters, clients, vendedores).filter(
      (p) => p.status === "Aguardando Devolução" || p.status === "Atrasado",
    )

    if (pedidosFiltrados.length === 0) {
      throw new Error("Não há pedidos pendentes no período selecionado")
    }

    const doc = new jsPDF("portrait", "mm", "a4")
    await addHeader(doc, "Relatório de Pedidos Pendentes")

    // Preparar dados da tabela
    const tableData = pedidosFiltrados.map((pedido) => {
      const cliente = clients.find((c) => c.id === pedido.cliente_id)
      const vendedor = vendedores.find((v) => v.id === pedido.vendedor_id)
      const diasPendente = getDaysPending(pedido.data_venda)

      return [
        pedido.numero_pedido,
        cliente?.nome || "-",
        vendedor?.nome || "-",
        formatDate(pedido.data_venda),
        formatCurrency(pedido.valor_total || 0),
        pedido.status,
        `${diasPendente} dias`,
      ]
    })

    // Calcular totais
    const valorTotal = pedidosFiltrados.reduce((sum, p) => sum + (p.valor_total || 0), 0)

    // Adicionar tabela
    autoTable(doc, {
      ...getDefaultTableStyles(),
      head: [["Pedido", "Cliente", "Vendedor", "Data", "Valor Total", "Status", "Dias Pendente"]],
      body: tableData,
      foot: [
        [
          "TOTAL",
          "",
          "",
          `${pedidosFiltrados.length} pedidos`,
          formatCurrency(valorTotal),
          "",
          "",
        ],
      ],
      footStyles: {
        fillColor: BRAND_ORANGE,
        textColor: 255,
        fontStyle: "bold",
      },
    })

    // Adicionar rodapé
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      addFooter(doc, i, totalPages)
    }

    // Salvar PDF
    const periodoText = filters.dataInicio && filters.dataFim
      ? `${formatDate(filters.dataInicio)}_${formatDate(filters.dataFim)}`
      : filters.periodoFiltro || "todos"
    savePDF(doc, `Relatorio_Pedidos_Pendentes_${periodoText}.pdf`)
  } catch (error: any) {
    console.error("[PDF] Erro ao gerar relatório de pedidos pendentes:", error)
    throw error
  }
}

/**
 * Gera PDF individual de um pedido (documento oficial)
 */
export async function generatePedidoIndividualPDF(
  pedido: OrderWithItems,
  cliente: Cliente,
  vendedor: Vendedor,
): Promise<void> {
  try {
    const doc = new jsPDF("portrait", "mm", "a4")
    await addHeader(doc, "Pedido de Venda")

    // Posição inicial após a linha divisória (Y=25 + margem)
    let yPos = 35
    const pageWidth = doc.internal.pageSize.getWidth()
    const leftColX = 20
    const rightColX = pageWidth / 2 + 10
    const colWidth = (pageWidth - 40) / 2 - 10

    // Função auxiliar para converter hex para RGB
    const hexToRgb = (hex: string): [number, number, number] => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16),
          ]
        : [0, 0, 0]
    }

    const brandBlueRgb = hexToRgb(BRAND_BLUE)
    const grayLightRgb = hexToRgb("#f3f4f6")

    // Seção: Dados do Cliente (Coluna Esquerda)
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(brandBlueRgb[0], brandBlueRgb[1], brandBlueRgb[2])
    doc.text("DADOS DO CLIENTE", leftColX, yPos)
    yPos += 6

    // Caixa de fundo cinza claro para os dados do cliente
    doc.setFillColor(grayLightRgb[0], grayLightRgb[1], grayLightRgb[2])
    doc.rect(leftColX, yPos - 2, colWidth, 40, "F")

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(0, 0, 0)
    let clientY = yPos + 4

    doc.text(`Nome/Razão Social:`, leftColX + 2, clientY)
    const clienteNomeLines = doc.splitTextToSize(cliente.nome, colWidth - 4)
    doc.text(clienteNomeLines, leftColX + 2, clientY + 4)
    clientY += 4 + (clienteNomeLines.length * 4)

    if (cliente.cnpj) {
      const cnpjFormatado = cliente.cnpj.length === 14
        ? `${cliente.cnpj.slice(0, 2)}.${cliente.cnpj.slice(2, 5)}.${cliente.cnpj.slice(5, 8)}/${cliente.cnpj.slice(8, 12)}-${cliente.cnpj.slice(12)}`
        : cliente.cnpj
      doc.text(`CNPJ: ${cnpjFormatado}`, leftColX + 2, clientY)
      clientY += 5
    }

    if (cliente.email) {
      doc.text(`Email: ${cliente.email}`, leftColX + 2, clientY)
      clientY += 5
    }

    if (cliente.telefone) {
      doc.text(`Telefone: ${cliente.telefone}`, leftColX + 2, clientY)
      clientY += 5
    }

    if (cliente.endereco) {
      doc.text(`Endereço:`, leftColX + 2, clientY)
      const enderecoLines = doc.splitTextToSize(cliente.endereco, colWidth - 4)
      doc.text(enderecoLines, leftColX + 2, clientY + 4)
      clientY += 4 + (enderecoLines.length * 4)
    }

    // Seção: Dados do Pedido e Vendedor (Coluna Direita)
    let rightY = yPos - 2
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(brandBlueRgb[0], brandBlueRgb[1], brandBlueRgb[2])
    doc.text("INFORMAÇÕES DO PEDIDO", rightColX, rightY)
    rightY += 6

    // Caixa de fundo cinza claro para os dados do pedido
    doc.setFillColor(grayLightRgb[0], grayLightRgb[1], grayLightRgb[2])
    doc.rect(rightColX, rightY - 2, colWidth, 40, "F")

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(0, 0, 0)
    let pedidoY = rightY + 4

    doc.text(`Número: ${pedido.numero_pedido}`, rightColX + 2, pedidoY)
    pedidoY += 5
    doc.text(`Data: ${formatDateTime(pedido.data_venda)}`, rightColX + 2, pedidoY)
    pedidoY += 5
    doc.text(`Tipo: ${pedido.tipo_venda}`, rightColX + 2, pedidoY)
    pedidoY += 5
    doc.text(`Status: ${pedido.status}`, rightColX + 2, pedidoY)
    pedidoY += 8

    // Dados do Vendedor
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(brandBlueRgb[0], brandBlueRgb[1], brandBlueRgb[2])
    doc.text("VENDEDOR", rightColX, pedidoY)
    pedidoY += 6

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(0, 0, 0)
    doc.text(`Nome: ${vendedor.nome}`, rightColX + 2, pedidoY)
    pedidoY += 5

    if (vendedor.email) {
      doc.text(`Email: ${vendedor.email}`, rightColX + 2, pedidoY)
    }

    // Posição Y para a tabela (após as caixas de informações)
    yPos = Math.max(clientY, pedidoY) + 10

    // Tabela de Itens
    if (pedido.order_items && pedido.order_items.length > 0) {
      const tableData = pedido.order_items.map((item) => {
        // Calcular preço original (antes do desconto)
        // Se preco_unitario já tem desconto aplicado, calcular o original
        const precoOriginal = item.desconto_percentual > 0 && item.desconto_percentual < 100
          ? item.preco_unitario / (1 - item.desconto_percentual / 100)
          : item.preco_unitario
        
        // Calcular valor do desconto: (preço original - preço unitário) * quantidade
        const valorDescontoPorUnidade = precoOriginal - item.preco_unitario
        const valorDescontoTotal = valorDescontoPorUnidade * item.quantidade
        
        const subtotal = item.preco_final * item.quantidade

        return [
          item.produto_nome,
          item.quantidade.toString(),
          formatCurrency(precoOriginal),
          `${item.desconto_percentual.toFixed(2)}%`,
          formatCurrency(valorDescontoTotal),
          formatCurrency(subtotal),
        ]
      })

      // Usar brandBlueRgb já definido no início da função

      autoTable(doc, {
        ...getDefaultTableStyles(),
        startY: yPos,
        head: [["Produto", "Qtd", "Preço Unit.", "Desconto %", "Valor Desconto", "Subtotal"]],
        body: tableData,
        headStyles: {
          fillColor: brandBlueRgb,
          textColor: 255,
          fontStyle: "bold",
          fontSize: 10,
        },
      })

      yPos = (doc as any).lastAutoTable.finalY + 10
    }

    // Totais
    // Subtotal = soma dos preços originais (antes do desconto) * quantidade
    const subtotal = pedido.order_items?.reduce((sum, item) => {
      const precoOriginal = item.preco_unitario / (1 - (item.desconto_percentual || 0) / 100)
      return sum + precoOriginal * item.quantidade
    }, 0) || 0

    // Total de descontos = soma dos valores de desconto
    const totalDescontos = pedido.order_items?.reduce(
      (sum, item) => sum + calculateDescontoValue(item),
      0,
    ) || 0

    // Total geral = subtotal - descontos (ou usar o valor_total do pedido se estiver correto)
    const totalGeralCalculado = subtotal - totalDescontos
    const totalGeral = pedido.valor_total && Math.abs(pedido.valor_total - totalGeralCalculado) < 0.01 
      ? pedido.valor_total 
      : totalGeralCalculado

    doc.setFontSize(11)
    doc.text(`Subtotal: ${formatCurrency(subtotal)}`, 150, yPos, { align: "right" })
    yPos += 7
    doc.text(`Total de Descontos: ${formatCurrency(totalDescontos)}`, 150, yPos, { align: "right" })
    yPos += 7

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    const brandOrangeRgb = hexToRgb(BRAND_ORANGE)
    doc.setTextColor(brandOrangeRgb[0], brandOrangeRgb[1], brandOrangeRgb[2])
    doc.text(`TOTAL GERAL: ${formatCurrency(totalGeral)}`, 150, yPos, { align: "right" })

    // Observações (se existir)
    if (pedido.observacoes) {
      yPos += 15
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      const brandBlueRgb = hexToRgb(BRAND_BLUE)
      doc.setTextColor(brandBlueRgb[0], brandBlueRgb[1], brandBlueRgb[2])
      doc.text("OBSERVAÇÕES:", 20, yPos)
      yPos += 7
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)
      const splitObservacoes = doc.splitTextToSize(pedido.observacoes, 170)
      doc.text(splitObservacoes, 20, yPos)
    }

    // Adicionar rodapé
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      addFooter(doc, i, totalPages)
    }

    // Salvar PDF
    savePDF(doc, `Pedido_${pedido.numero_pedido}.pdf`)
  } catch (error: any) {
    console.error("[PDF] Erro ao gerar PDF do pedido:", error)
    throw error
  }
}

