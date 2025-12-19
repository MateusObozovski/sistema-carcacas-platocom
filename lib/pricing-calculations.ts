/**
 * Calcula o desconto máximo permitido em % baseado no preço de venda e valor da carcaça
 * @param precoVenda Preço de venda negociado
 * @param carcassValue Valor fixo da carcaça
 * @returns Desconto máximo em porcentagem
 */
export function calculateMaxDiscountPercent(
  precoVenda: number,
  carcassValue: number
): number {
  if (precoVenda <= 0 || carcassValue <= 0) return 0;
  return (carcassValue / precoVenda) * 100;
}

/**
 * Calcula o valor monetário do desconto baseado na porcentagem
 * @param precoVenda Preço de venda negociado
 * @param descontoPercent Desconto em porcentagem
 * @returns Valor monetário do desconto
 */
export function calculateDiscountValue(
  precoVenda: number,
  descontoPercent: number
): number {
  return (precoVenda * descontoPercent) / 100;
}

/**
 * Calcula a receita retida (lucro) na negociação da carcaça
 * @param carcassValue Valor fixo da carcaça
 * @param descontoRealConcedido Valor monetário do desconto realmente aplicado
 * @returns Valor gerado (receita retida)
 */
export function calculateRetainedRevenue(
  carcassValue: number,
  descontoRealConcedido: number
): number {
  return Math.max(0, carcassValue - descontoRealConcedido);
}

/**
 * Valida se o desconto aplicado não excede o valor da carcaça
 * @param precoVenda Preço de venda negociado
 * @param descontoPercent Desconto em porcentagem
 * @param carcassValue Valor fixo da carcaça
 * @returns true se válido, false caso contrário
 */
export function validateDiscount(
  precoVenda: number,
  descontoPercent: number,
  carcassValue: number
): boolean {
  const descontoValue = calculateDiscountValue(precoVenda, descontoPercent);
  return descontoValue <= carcassValue;
}
