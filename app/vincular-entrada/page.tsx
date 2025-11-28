"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Search, Link2, CheckCircle, XCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getMerchandiseEntries,
  getMerchandiseEntryById,
  getPendingCarcacasByCliente,
  vincularEntradaComCarcacas,
  type MerchandiseEntryWithItems,
} from "@/lib/supabase/database"
import { Badge } from "@/components/ui/badge"

export default function VincularEntradaPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [entradas, setEntradas] = useState<MerchandiseEntryWithItems[]>([])
  const [selectedEntry, setSelectedEntry] = useState<MerchandiseEntryWithItems | null>(null)
  const [carcacasPendentes, setCarcacasPendentes] = useState<any[]>([])
  const [vinculos, setVinculos] = useState<Map<string, { orderItemId: string; quantidade: number }>>(
    new Map()
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return

        setIsLoading(true)

        // Buscar entradas pendentes (todos exceto operador podem ver todas)
        const entradasData = await getMerchandiseEntries()
        const entradasPendentes = entradasData.filter((e) => e.status === "Pendente")
        
        // Buscar itens para cada entrada para ter a contagem correta
        const entradasComItens = await Promise.all(
          entradasPendentes.map(async (entrada) => {
            try {
              const entradaCompleta = await getMerchandiseEntryById(entrada.id)
              return entradaCompleta
            } catch (error) {
              console.error(`[v0] Error fetching items for entry ${entrada.id}:`, error)
              return { ...entrada, items: [] } as MerchandiseEntryWithItems
            }
          })
        )
        
        setEntradas(entradasComItens)
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, toast])

  const handleSelectEntry = async (entryId: string) => {
    try {
      setIsLoading(true)
      const entry = await getMerchandiseEntryById(entryId)
      setSelectedEntry(entry)

      // Buscar carcaças pendentes do cliente
      const carcacas = await getPendingCarcacasByCliente(entry.cliente_id)
      setCarcacasPendentes(carcacas || [])

      // Inicializar vínculos vazios (sem sugestão automática)
      setVinculos(new Map())
    } catch (error) {
      console.error("[v0] Error loading entry:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar a entrada",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVinculoChange = (entryItemId: string, orderItemId: string, quantidade: number) => {
    const novosVinculos = new Map(vinculos)
    if (quantidade > 0 && orderItemId) {
      // Encontrar a carcaça selecionada para validar o débito disponível
      const carcaca = carcacasPendentes.find((c) => c.id === orderItemId)
      if (carcaca) {
        // Limitar a quantidade ao débito disponível
        const quantidadeLimitada = Math.min(quantidade, carcaca.debito_carcaca)
        novosVinculos.set(entryItemId, { orderItemId, quantidade: quantidadeLimitada })
      } else {
        novosVinculos.set(entryItemId, { orderItemId, quantidade })
      }
    } else {
      novosVinculos.delete(entryItemId)
    }
    setVinculos(novosVinculos)
  }

  const handleConfirmarVinculo = async () => {
    if (vinculos.size === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum vínculo foi definido",
        variant: "destructive",
      })
      return
    }

    // Validar todos os vínculos antes de processar
    const erros: string[] = []
    for (const [entryItemId, vinculo] of vinculos.entries()) {
      const carcaca = carcacasPendentes.find((c) => c.id === vinculo.orderItemId)
      if (!carcaca) {
        erros.push(`Carcaça não encontrada para o item`)
        continue
      }
      
      if (vinculo.quantidade > carcaca.debito_carcaca) {
        const item = selectedEntry?.items.find((i) => i.id === entryItemId)
        erros.push(
          `Item "${item?.produto_nome || "desconhecido"}": quantidade (${vinculo.quantidade}) excede o débito disponível (${carcaca.debito_carcaca}) do pedido ${carcaca.orders?.numero_pedido || "N/A"}`
        )
      }
    }

    if (erros.length > 0) {
      toast({
        title: "Erro de Validação",
        description: erros.join(". "),
        variant: "destructive",
      })
      return
    }

    setIsLinking(true)

    try {
      for (const [entryItemId, vinculo] of vinculos.entries()) {
        await vincularEntradaComCarcacas(entryItemId, vinculo.orderItemId, vinculo.quantidade)
      }

      toast({
        title: "Sucesso",
        description: "Vínculos confirmados com sucesso",
      })

      // Recarregar entrada
      if (selectedEntry) {
        // Pequeno delay para garantir que as atualizações no banco sejam refletidas
        await new Promise((resolve) => setTimeout(resolve, 500))
        
        const entry = await getMerchandiseEntryById(selectedEntry.id)
        setSelectedEntry(entry)

        // Buscar carcaças pendentes atualizadas (após o delay para garantir sincronização)
        const carcacas = await getPendingCarcacasByCliente(entry.cliente_id)
        setCarcacasPendentes(carcacas || [])

        // Limpar vínculos
        setVinculos(new Map())
      }

      // Recarregar lista de entradas com itens
      const entradasData = await getMerchandiseEntries()
      const entradasPendentes = entradasData.filter((e) => e.status === "Pendente")
      
      // Buscar itens para cada entrada para ter a contagem correta
      const entradasComItens = await Promise.all(
        entradasPendentes.map(async (entrada) => {
          try {
            const entradaCompleta = await getMerchandiseEntryById(entrada.id)
            return entradaCompleta
          } catch (error) {
            console.error(`[v0] Error fetching items for entry ${entrada.id}:`, error)
            return { ...entrada, items: [] } as MerchandiseEntryWithItems
          }
        })
      )
      
      setEntradas(entradasComItens)
    } catch (error: any) {
      console.error("[v0] Error linking:", error)
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível confirmar os vínculos",
        variant: "destructive",
      })
    } finally {
      setIsLinking(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const entradasFiltradas = entradas.filter((entrada) => {
    const matchSearch =
      entrada.numero_nota_fiscal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrada.clients?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchSearch
  })

  if (isLoading && !selectedEntry) {
    return (
      <ProtectedRoute allowedRoles={["admin", "Gerente", "Coordenador", "Vendedor"]}>
        <main className="p-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </main>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "Gerente", "Coordenador", "Vendedor"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Vincular Entrada de Mercadoria</h1>
          <p className="text-muted-foreground">
            Vincule itens de entradas de mercadoria com carcaças pendentes
          </p>
        </div>

        {!selectedEntry ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Entradas Pendentes</CardTitle>
                <CardDescription>
                  Selecione uma entrada para vincular com carcaças pendentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nota fiscal ou cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                {entradasFiltradas.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhuma entrada pendente encontrada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nota Fiscal</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data da Nota</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Volumes</TableHead>
                        <TableHead>Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entradasFiltradas.map((entrada) => {
                        const totalVolumes = entrada.items?.reduce((sum, item) => sum + (item.quantidade || 0), 0) || 0
                        return (
                          <TableRow key={entrada.id}>
                            <TableCell className="font-medium">
                              {entrada.numero_nota_fiscal}
                            </TableCell>
                            <TableCell>{entrada.clients?.nome || "N/A"}</TableCell>
                            <TableCell>{formatDate(entrada.data_nota)}</TableCell>
                            <TableCell>{entrada.items?.length || 0} item(ns)</TableCell>
                            <TableCell className="font-medium">{totalVolumes} volume(ns)</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => handleSelectEntry(entrada.id)}
                                disabled={isLoading}
                              >
                                <Link2 className="mr-2 h-4 w-4" />
                                Vincular
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Entrada: {selectedEntry.numero_nota_fiscal}</CardTitle>
                    <CardDescription>
                      Cliente: {selectedEntry.clients?.nome || "N/A"} | Data:{" "}
                      {formatDate(selectedEntry.data_nota)}
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                    Voltar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 font-semibold">Itens da Entrada</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="min-w-[300px]">Vincular com</TableHead>
                          <TableHead>Quantidade a Vincular</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedEntry.items.map((item) => {
                          const vinculo = vinculos.get(item.id)
                          const carcacaVinculada = vinculo
                            ? carcacasPendentes.find((c) => c.id === vinculo.orderItemId)
                            : null

                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.produto_nome}</TableCell>
                              <TableCell>{item.quantidade}</TableCell>
                              <TableCell>
                                {item.vinculado ? (
                                  <Badge variant="default">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Vinculado
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Pendente</Badge>
                                )}
                              </TableCell>
                              <TableCell className="min-w-[300px]">
                                {item.vinculado ? (
                                  <span className="text-sm text-muted-foreground">
                                    Já vinculado
                                  </span>
                                ) : (
                                  <Select
                                    value={vinculo?.orderItemId || ""}
                                    onValueChange={(value) => {
                                      // Quando seleciona uma carcaça, limitar a quantidade inicial ao débito disponível
                                      const carcacaSelecionada = carcacasPendentes.find((c) => c.id === value)
                                      const quantidadeInicial = carcacaSelecionada
                                        ? Math.min(item.quantidade, carcacaSelecionada.debito_carcaca)
                                        : item.quantidade
                                      handleVinculoChange(item.id, value, quantidadeInicial)
                                    }}
                                    disabled={isLinking}
                                  >
                                    <SelectTrigger className="w-full min-w-[300px]">
                                      <SelectValue placeholder="Selecione uma carcaça" />
                                    </SelectTrigger>
                                    <SelectContent className="max-w-[500px]">
                                      {carcacasPendentes
                                        .filter(
                                          (c) =>
                                            c.debito_carcaca > 0 &&
                                            (c.produto_id === item.produto_id ||
                                              c.produto_nome?.toLowerCase() ===
                                                item.produto_nome?.toLowerCase())
                                        )
                                        .map((carcaca) => (
                                          <SelectItem key={carcaca.id} value={carcaca.id} className="whitespace-normal">
                                            {carcaca.produto_nome} - Carcaças Disponíveis: {carcaca.debito_carcaca} (Pedido:{" "}
                                            {carcaca.orders?.numero_pedido || "N/A"})
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.vinculado ? (
                                  <span className="text-sm text-muted-foreground">-</span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="1"
                                      max={Math.min(
                                        item.quantidade,
                                        carcacaVinculada?.debito_carcaca || item.quantidade
                                      )}
                                      value={vinculo?.quantidade || ""}
                                      onChange={(e) => {
                                        const quantidade = parseInt(e.target.value) || 0
                                        if (vinculo?.orderItemId) {
                                          handleVinculoChange(item.id, vinculo.orderItemId, quantidade)
                                        }
                                      }}
                                      disabled={!vinculo?.orderItemId || isLinking}
                                      className="w-24"
                                    />
                                    {vinculo?.orderItemId && carcacaVinculada && (
                                      <span className="text-xs text-muted-foreground">
                                        (máx: {Math.floor(carcacaVinculada.debito_carcaca)} carcaça(s))
                                      </span>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleConfirmarVinculo} disabled={isLinking || vinculos.size === 0}>
                      {isLinking ? "Vinculando..." : "Confirmar Vínculo"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Carcaças Pendentes do Cliente</CardTitle>
                <CardDescription>
                  Carcaças pendentes que podem ser vinculadas com os itens da entrada
                </CardDescription>
              </CardHeader>
              <CardContent>
                {carcacasPendentes.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhuma carcaça pendente encontrada para este cliente
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Carcaças Pendentes</TableHead>
                        <TableHead>Data da Venda</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carcacasPendentes.map((carcaca) => (
                        <TableRow key={carcaca.id}>
                          <TableCell className="font-medium">{carcaca.produto_nome}</TableCell>
                          <TableCell>{carcaca.orders?.numero_pedido || "N/A"}</TableCell>
                          <TableCell>{carcaca.debito_carcaca} carcaça(s)</TableCell>
                          <TableCell>
                            {carcaca.orders?.data_venda
                              ? formatDate(carcaca.orders.data_venda)
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ProtectedRoute>
  )
}

