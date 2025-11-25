"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import ProtectedRoute from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from "lucide-react"
import { createProduct } from "@/lib/supabase/database"
import { useToast } from "@/hooks/use-toast"
import type { Product } from "@/lib/types"

export default function ImportarProdutos() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [marca, setMarca] = useState("")
  const [tipo, setTipo] = useState("")
  const [textData, setTextData] = useState("")
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)

  const downloadTemplate = () => {
    const template = `APLICAÇÃO\tDIÂMETRO\tCÓDIGO KIT\tPREÇO KIT\tB/T% KIT\tCÓDIGO PLATÔ\tPREÇO PLATÔ\tB/T% PLATÔ\tCÓDIGO MANCAL\tPREÇO MANCAL\tB/T% MANCAL\tCÓDIGO DISCO\tPREÇO DISCO\tB/T% DISCO
1113/1114\t250MM\t3482000734\t1250.00\t15%\t3482000734\t850.00\t12%\t3482000734\t180.00\t10%\t3482000734\t220.00\t10%
1313/1513\t280MM\t3482000735\t1450.00\t15%\t3482000735\t950.00\t12%\t3482000735\t200.00\t10%\t3482000735\t300.00\t10%
1620/1720\t310MM\t3482000736\t1650.00\t15%\t3482000736\t1050.00\t12%\t3482000736\t220.00\t10%\t3482000736\t380.00\t10%`

    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "template-importacao-produtos.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const parseSpreadsheetData = (data: string): Product[] => {
    const products: Product[] = []
    const lines = data.split("\n").filter((line) => line.trim())

    // Skip header lines and process data rows
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || line.includes("CÓDIGO") || line.includes("APLICAÇÃO")) continue

      // Split by tabs or multiple spaces
      const columns = line.split(/\t+|\s{2,}/)

      if (columns.length < 3) continue

      // Try to identify the structure
      const aplicacao = columns[0]
      const diametro = columns[1]

      // Look for price patterns (numbers with decimals or commas)
      const pricePattern = /[\d.,]+/

      // Parse KIT if present
      if (columns.length >= 4 && pricePattern.test(columns[3])) {
        const codigoKit = columns[2] || ""
        const precoKit = Number.parseFloat(columns[3].replace(/[^\d,]/g, "").replace(",", "."))
        const descontoKit = columns[4] ? Number.parseFloat(columns[4].replace("%", "")) : 10

        if (!isNaN(precoKit) && precoKit > 0) {
          products.push({
            id: `${Date.now()}-kit-${products.length}`,
            name: `Kit ${marca} ${aplicacao} ${diametro}`,
            marca,
            tipo,
            categoria: "kit",
            aplicacao,
            diametro,
            codigoFabrica: codigoKit,
            precoBase: precoKit,
            descontoMaximo: descontoKit,
            ativo: true,
            dataCriacao: new Date().toISOString(),
          })
        }
      }

      // Parse PLATÔ
      const platoIndex = columns.findIndex((col) => /^\d{4,}$/.test(col))
      if (platoIndex > 0 && columns[platoIndex + 1]) {
        const codigoPlato = columns[platoIndex]
        const precoPlato = Number.parseFloat(columns[platoIndex + 1].replace(/[^\d,]/g, "").replace(",", "."))
        const descontoPlato = columns[platoIndex + 2] ? Number.parseFloat(columns[platoIndex + 2].replace("%", "")) : 10

        if (!isNaN(precoPlato) && precoPlato > 0) {
          products.push({
            id: `${Date.now()}-plato-${products.length}`,
            name: `Platô ${marca} ${aplicacao} ${diametro}`,
            marca,
            tipo,
            categoria: "plato",
            aplicacao,
            diametro,
            codigoFabrica: codigoPlato,
            precoBase: precoPlato,
            descontoMaximo: descontoPlato,
            ativo: true,
            dataCriacao: new Date().toISOString(),
          })
        }
      }
    }

    return products
  }

  const handleImport = async () => {
    if (!marca || !tipo || !textData) {
      setResult({ success: 0, errors: ["Preencha Marca, Tipo e cole os dados da planilha"] })
      return
    }

    setImporting(true)
    setResult(null)

    try {
      const newProducts = parseSpreadsheetData(textData)

      if (newProducts.length === 0) {
        setResult({ success: 0, errors: ["Nenhum produto válido encontrado nos dados"] })
        setImporting(false)
        return
      }

      // Criar produtos no Supabase
      const errors: string[] = []
      let successCount = 0

      for (const product of newProducts) {
        try {
          await createProduct({
            nome: product.name,
            marca: product.marca,
            tipo: product.tipo,
            categoria: product.categoria,
            aplicacao: product.aplicacao || undefined,
            diametro: product.diametro || undefined,
            codigo_fabrica: product.codigoFabrica || undefined,
            preco_base: product.precoBase,
            desconto_maximo_bt: product.descontoMaximo,
            ativo: product.ativo,
          })
          successCount++
        } catch (error: any) {
          errors.push(`Erro ao criar ${product.name}: ${error.message || "Erro desconhecido"}`)
        }
      }

      if (successCount > 0) {
        toast({
          title: "Importação concluída",
          description: `${successCount} produtos importados com sucesso`,
        })
      }

      setResult({
        success: successCount,
        errors,
      })
      setTextData("")
    } catch (error: any) {
      setResult({
        success: 0,
        errors: [`Erro ao processar dados: ${error.message || "Erro desconhecido"}`],
      })
      toast({
        title: "Erro na importação",
        description: "Não foi possível processar os dados",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "Gerente", "Coordenador", "Vendedor"]}>
      <main className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Importar Produtos</h1>
            <p className="text-gray-400">Cole os dados da planilha para importar produtos em massa</p>
          </div>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca" className="text-white">
                    Marca
                  </Label>
                  <Select value={marca} onValueChange={setMarca}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Selecione a marca" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="Mercedes Benz">Mercedes Benz</SelectItem>
                      <SelectItem value="Ford">Ford</SelectItem>
                      <SelectItem value="Volvo">Volvo</SelectItem>
                      <SelectItem value="Scania">Scania</SelectItem>
                      <SelectItem value="Volkswagen">Volkswagen</SelectItem>
                      <SelectItem value="Iveco">Iveco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo" className="text-white">
                    Tipo
                  </Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="Caminhões">Caminhões</SelectItem>
                      <SelectItem value="Ônibus">Ônibus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data" className="text-white">
                  Dados da Planilha
                </Label>
                <Textarea
                  id="data"
                  value={textData}
                  onChange={(e) => setTextData(e.target.value)}
                  placeholder="Cole aqui os dados copiados da planilha (Ctrl+C na planilha, Ctrl+V aqui)..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[300px] font-mono text-sm"
                />
                <p className="text-sm text-gray-400">
                  Selecione as linhas na planilha do Google Sheets, copie (Ctrl+C) e cole aqui
                </p>
              </div>

              {result && (
                <div
                  className={`p-4 rounded-lg border ${
                    result.errors.length > 0 ? "bg-red-500/10 border-red-500/50" : "bg-green-500/10 border-green-500/50"
                  }`}
                >
                  {result.success > 0 && (
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">{result.success} produtos importados com sucesso!</span>
                    </div>
                  )}
                  {result.errors.length > 0 && (
                    <div className="space-y-1">
                      {result.errors.map((error, i) => (
                        <div key={i} className="flex items-start gap-2 text-red-400">
                          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleImport}
                  disabled={importing || !marca || !tipo || !textData}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {importing ? (
                    <>Importando...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Produtos
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setTextData("")
                    setResult(null)
                  }}
                  className="border-zinc-700 text-white hover:bg-zinc-800"
                >
                  Limpar
                </Button>

                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="border-zinc-700 text-white hover:bg-zinc-800 bg-transparent"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Modelo
                </Button>
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="space-y-2 text-sm text-gray-300">
                <p className="font-medium text-white">Como importar:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Baixe o modelo CSV clicando em "Baixar Modelo"</li>
                  <li>Abra o arquivo no Excel ou Google Sheets</li>
                  <li>Preencha os dados dos produtos seguindo o formato do exemplo</li>
                  <li>Selecione e copie as linhas com os produtos (sem o cabeçalho)</li>
                  <li>Selecione a Marca e o Tipo acima</li>
                  <li>Cole os dados no campo de texto (Ctrl+V ou Cmd+V)</li>
                  <li>Clique em "Importar Produtos"</li>
                </ol>
                <p className="text-gray-400 mt-3">
                  O sistema irá processar automaticamente os dados e criar os produtos com KIT, PLATÔ, MANCAL e DISCO.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </ProtectedRoute>
  )
}
