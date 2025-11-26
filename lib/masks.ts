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

