import { Badge } from "@/components/ui/badge"
import type { Pedido } from "@/lib/types"

interface StatusBadgeProps {
  status: Pedido["statusCarcaca"]
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants: Record<Pedido["statusCarcaca"], { label: string; className: string }> = {
    aguardando: {
      label: "Aguardando",
      className: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
    },
    atrasado: {
      label: "Atrasado",
      className: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
    },
    devolvida: {
      label: "Devolvida",
      className: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
    },
    "perda-total": {
      label: "Perda Total",
      className: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
    },
  }

  const variant = variants[status]

  return <Badge className={variant.className}>{variant.label}</Badge>
}
