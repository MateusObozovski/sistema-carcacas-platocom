"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { mockVendedores, mockPedidos } from "@/lib/mock-data"
import Link from "next/link"
import { Search, TrendingUp, TrendingDown } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function VendedoresPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [pedidos, setPedidos] = useState(mockPedidos)

  useEffect(() => {
    const pedidosLocal = JSON.parse(localStorage.getItem("pedidos") || "[]")
    const todosPedidos = [...mockPedidos, ...pedidosLocal]
    setPedidos(todosPedidos)
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const vendedoresComDados = mockVendedores.map((vendedor) => {
    const pedidosVendedor = pedidos.filter((p) => p.vendedorId === vendedor.id)
    const totalVendas = pedidosVendedor.length
    const vendasBaseTroca = pedidosVendedor.filter((p) => p.tipoVenda === "base-troca").length
    const percentualBaseTroca = totalVendas > 0 ? (vendasBaseTroca / totalVendas) * 100 : 0

    return {
      ...vendedor,
      totalVendas,
      vendasBaseTroca,
      percentualBaseTroca,
    }
  })

  const vendedoresFiltrados = vendedoresComDados
    .filter((vendedor) => vendedor.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.debitoTotal - a.debitoTotal)

  const debitoTotal = vendedoresComDados.reduce((acc, v) => acc + v.debitoTotal, 0)
  const carcacasTotal = vendedoresComDados.reduce((acc, v) => acc + v.carcacasPendentes, 0)

  return (
    <ProtectedRoute allowedRoles={["Patrão", "Gerente", "Coordenador"]}>
      <div className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Vendedores</h2>
            <p className="text-muted-foreground">Gerencie e visualize o desempenho dos vendedores</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Vendedores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockVendedores.length}</div>
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
                              <p className="font-medium">{vendedor.name}</p>
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
                          <Link href={`/vendedores/${vendedor.id}`} className="text-sm text-primary hover:underline">
                            Ver detalhes
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
