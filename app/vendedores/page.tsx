"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { getVendedores, getOrders, getVendedorDetalhes, type DatabaseVendedor, type VendedorDetalhes } from "@/lib/supabase/database"
import { Search, TrendingUp, TrendingDown, Plus, Info } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export default function VendedoresPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [vendedores, setVendedores] = useState<DatabaseVendedor[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newVendedorForm, setNewVendedorForm] = useState({
    name: "",
    email: "",
    password: "",
  })
  const [selectedVendedorId, setSelectedVendedorId] = useState<string | null>(null)
  const [vendedorDetalhes, setVendedorDetalhes] = useState<VendedorDetalhes | null>(null)
  const [isLoadingDetalhes, setIsLoadingDetalhes] = useState(false)
  const [showDetalhesDialog, setShowDetalhesDialog] = useState(false)

  const loadVendedores = async () => {
    try {
      setIsLoading(true)
      const [vendedoresData, ordersData] = await Promise.all([getVendedores(), getOrders()])
      setVendedores(vendedoresData)
      setOrders(ordersData)
    } catch (error) {
      console.error("[v0] Error loading vendedores:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVendedores()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const vendedoresComDados = vendedores.map((vendedor) => {
    const pedidosVendedor = orders.filter((p) => p.vendedor_id === vendedor.id)
    const totalVendas = pedidosVendedor.length
    const vendasBaseTroca = pedidosVendedor.filter((p) => p.tipo_venda === "Base de Troca").length
    const percentualBaseTroca = totalVendas > 0 ? (vendasBaseTroca / totalVendas) * 100 : 0

    return {
      ...vendedor,
      totalVendas,
      vendasBaseTroca,
      percentualBaseTroca,
    }
  })

  const vendedoresFiltrados = vendedoresComDados
    .filter((vendedor) => vendedor.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.debitoTotal - a.debitoTotal)

  const debitoTotal = vendedoresComDados.reduce((acc, v) => acc + v.debitoTotal, 0)
  const carcacasTotal = vendedoresComDados.reduce((acc, v) => acc + v.carcacasPendentes, 0)

  const handleOpenDetalhes = async (vendedorId: string) => {
    setSelectedVendedorId(vendedorId)
    setShowDetalhesDialog(true)
    setIsLoadingDetalhes(true)
    setVendedorDetalhes(null)

    try {
      const detalhes = await getVendedorDetalhes(vendedorId)
      setVendedorDetalhes(detalhes)
    } catch (error) {
      console.error("[v0] Error loading vendedor detalhes:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes do vendedor",
        variant: "destructive",
      })
    } finally {
      setIsLoadingDetalhes(false)
    }
  }

  const handleCloseDetalhes = () => {
    setShowDetalhesDialog(false)
    setSelectedVendedorId(null)
    setVendedorDetalhes(null)
  }

  const handleCreateVendedor = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newVendedorForm,
          role: "Vendedor", // Fixo como Vendedor
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Erro",
          description: data.error || "Não foi possível criar o vendedor",
          variant: "destructive",
        })
        setIsCreating(false)
        return
      }

      toast({
        title: "Sucesso",
        description: "Vendedor criado com sucesso!",
      })

      // Limpar formulário e fechar dialog
      setNewVendedorForm({
        name: "",
        email: "",
        password: "",
      })
      setShowCreateDialog(false)

      // Recarregar lista de vendedores após um pequeno delay
      setTimeout(() => {
        loadVendedores()
      }, 1000)
    } catch (error: any) {
      console.error("[v0] Error creating vendedor:", error)
      toast({
        title: "Erro",
        description: "Não foi possível criar o vendedor",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["admin", "Gerente", "Coordenador"]}>
        <div className="p-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "Gerente", "Coordenador"]}>
      <div className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Vendedores</h2>
              <p className="text-muted-foreground">Gerencie e visualize o desempenho dos vendedores</p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Vendedor
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Vendedores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vendedores.length}</div>
                <p className="text-xs text-muted-foreground">Vendedores ativos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Débito Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(debitoTotal)}</div>
                <p className="text-xs text-muted-foreground">Soma de todos os débitos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Carcaças Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{carcacasTotal}</div>
                <p className="text-xs text-muted-foreground">Total aguardando devolução</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Buscar Vendedor</CardTitle>
              <CardDescription>Encontre vendedores por nome</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Vendedores</CardTitle>
              <CardDescription>{vendedoresFiltrados.length} vendedores encontrados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Débito Total</TableHead>
                    <TableHead className="text-right">Carcaças</TableHead>
                    <TableHead className="text-right">Total Vendas</TableHead>
                    <TableHead>Base de Troca</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendedoresFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Nenhum vendedor encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendedoresFiltrados.map((vendedor, index) => (
                      <TableRow key={vendedor.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{vendedor.nome}</p>
                              {vendedor.debitoTotal > 25000 && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  Alto débito
                                </p>
                              )}
                              {vendedor.debitoTotal < 15000 && (
                                <p className="text-xs text-green-500 flex items-center gap-1">
                                  <TrendingDown className="h-3 w-3" />
                                  Baixo débito
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              vendedor.debitoTotal > 25000
                                ? "font-bold text-red-500"
                                : vendedor.debitoTotal < 15000
                                  ? "font-bold text-green-500"
                                  : "font-bold"
                            }
                          >
                            {formatCurrency(vendedor.debitoTotal)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{vendedor.carcacasPendentes}</TableCell>
                        <TableCell className="text-right">{vendedor.totalVendas}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {vendedor.vendasBaseTroca} de {vendedor.totalVendas}
                              </span>
                              <span className="font-medium">{vendedor.percentualBaseTroca.toFixed(0)}%</span>
                            </div>
                            <Progress value={vendedor.percentualBaseTroca} className="h-1" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetalhes(vendedor.id)}
                            className="text-sm"
                          >
                            <Info className="h-4 w-4 mr-1" />
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Vendedor</DialogTitle>
              <DialogDescription>Preencha os dados do novo vendedor do sistema</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateVendedor} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newVendedorName">Nome Completo</Label>
                <Input
                  id="newVendedorName"
                  value={newVendedorForm.name}
                  onChange={(e) => setNewVendedorForm({ ...newVendedorForm, name: e.target.value })}
                  required
                  minLength={2}
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newVendedorEmail">Email</Label>
                <Input
                  id="newVendedorEmail"
                  type="email"
                  value={newVendedorForm.email}
                  onChange={(e) => setNewVendedorForm({ ...newVendedorForm, email: e.target.value })}
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newVendedorPassword">Senha</Label>
                <Input
                  id="newVendedorPassword"
                  type="password"
                  value={newVendedorForm.password}
                  onChange={(e) => setNewVendedorForm({ ...newVendedorForm, password: e.target.value })}
                  required
                  minLength={6}
                  disabled={isCreating}
                />
                <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false)
                    setNewVendedorForm({
                      name: "",
                      email: "",
                      password: "",
                    })
                  }}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Criando..." : "Criar Vendedor"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showDetalhesDialog} onOpenChange={handleCloseDetalhes}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Detalhes do Vendedor</DialogTitle>
              <DialogDescription>Estatísticas detalhadas do vendedor selecionado</DialogDescription>
            </DialogHeader>
            {isLoadingDetalhes ? (
              <div className="py-8 text-center text-muted-foreground">Carregando detalhes...</div>
            ) : vendedorDetalhes ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Nome</Label>
                  <p className="text-base">{vendedorDetalhes.nome}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Total de Clientes</Label>
                  <p className="text-2xl font-bold">{vendedorDetalhes.totalClientes}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Pedidos por Status</Label>
                  <div className="space-y-1">
                    {Object.entries(vendedorDetalhes.pedidosPorStatus).length > 0 ? (
                      Object.entries(vendedorDetalhes.pedidosPorStatus).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center py-1 border-b border-border last:border-0">
                          <span className="text-sm text-muted-foreground">{status}</span>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Valor de Carcaças Pendentes</Label>
                  <p className="text-2xl font-bold text-red-500">
                    {formatCurrency(vendedorDetalhes.valorCarcacasPendentes)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Soma monetária total das carcaças pendentes
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Não foi possível carregar os detalhes
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDetalhes}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
