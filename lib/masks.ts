// Funções de máscara para campos de formulário

export function maskCNPJ(value: string): string {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, "")
  
  // Limita a 14 dígitos
  const limited = numbers.slice(0, 14)
  
  // Aplica máscara: 00.000.000/0000-00
  if (limited.length <= 2) {
    return limited
  } else if (limited.length <= 5) {
    return `${limited.slice(0, 2)}.${limited.slice(2)}`
  } else if (limited.length <= 8) {
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`
  } else if (limited.length <= 12) {
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`
  } else {
    return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12)}`
  }
}

export function maskPhone(value: string): string {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, "")
  
  // Limita a 10 dígitos (telefone fixo)
  const limited = numbers.slice(0, 10)
  
  // Aplica máscara: (00) 0000-0000
  if (limited.length <= 2) {
    return limited.length > 0 ? `(${limited}` : ""
  } else if (limited.length <= 6) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
  } else {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`
  }
}

export function maskCellphone(value: string): string {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, "")
  
  // Limita a 11 dígitos (celular com DDD)
  const limited = numbers.slice(0, 11)
  
  // Aplica máscara: (00) 00000-0000
  if (limited.length <= 2) {
    return limited.length > 0 ? `(${limited}` : ""
  } else if (limited.length <= 7) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
  } else {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`
  }
}

export function validateCNPJ(cnpj: string): boolean {
  // Remove formatação
  const numbers = cnpj.replace(/\D/g, "")
  
  // Deve ter exatamente 14 dígitos
  return numbers.length === 14
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function unmaskCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "")
}

export function unmaskPhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

// Funções para formatação monetária brasileira (ponto para milhar, vírgula para centavos)

/**
 * Formata um número para o formato monetário brasileiro
 * Exemplo: 1234.56 -> "1.234,56"
 */
export function formatCurrencyInput(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return "0,00";
  
  // Converte para string com 2 casas decimais
  const parts = value.toFixed(2).split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1] || "00";
  
  // Adiciona pontos como separador de milhar
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  return `${formattedInteger},${decimalPart}`;
}

/**
 * Converte uma string formatada (formato brasileiro) para número
 * Exemplo: "1.234,56" -> 1234.56
 */
export function parseCurrencyInput(value: string): number {
  if (!value || value.trim() === "") return 0;
  
  // Remove pontos (separador de milhar) e substitui vírgula por ponto
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Máscara para input de valor monetário (aceita apenas números, ponto e vírgula)
 * Formata enquanto o usuário digita
 */
export function maskCurrencyInput(value: string): string {
  // Remove tudo exceto números, vírgula e ponto
  let cleaned = value.replace(/[^\d,.]/g, "");
  
  // Garante que há no máximo uma vírgula
  const commaIndex = cleaned.indexOf(",");
  if (commaIndex !== -1) {
    cleaned = cleaned.slice(0, commaIndex + 1) + cleaned.slice(commaIndex + 1).replace(/,/g, "");
  }
  
  // Garante que há no máximo uma vírgula ou ponto (se não houver vírgula, permite ponto como decimal)
  if (commaIndex === -1) {
    const dotIndex = cleaned.indexOf(".");
    if (dotIndex !== -1) {
      // Se há ponto e não há vírgula, substitui o último ponto por vírgula (formato brasileiro)
      const lastDotIndex = cleaned.lastIndexOf(".");
      if (lastDotIndex !== -1 && cleaned.split(".").length > 2) {
        // Múltiplos pontos - mantém como separador de milhar, último ponto vira vírgula
        const parts = cleaned.split(".");
        cleaned = parts.slice(0, -1).join(".") + "," + parts[parts.length - 1];
      } else if (cleaned.split(".").length === 2 && cleaned.split(".")[1].length <= 2) {
        // Um ponto com até 2 dígitos após - converte para vírgula
        cleaned = cleaned.replace(".", ",");
      }
    }
  }
  
  // Limita a 2 casas decimais após a vírgula
  if (commaIndex !== -1) {
    const parts = cleaned.split(",");
    if (parts[1] && parts[1].length > 2) {
      cleaned = parts[0] + "," + parts[1].slice(0, 2);
    }
  }
  
  return cleaned;
}

