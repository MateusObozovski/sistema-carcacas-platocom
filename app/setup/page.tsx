"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [completed, setCompleted] = useState(false)

  const handleSetup = async () => {
    setLoading(true)
    setResults([])

    try {
      const response = await fetch("/api/setup-users", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.results)
        setCompleted(true)
      } else {
        alert("Erro ao criar usuários: " + data.error)
      }
    } catch (error: any) {
      alert("Erro: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-zinc-950 border-zinc-800 p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Configuração Inicial</h1>
            <p className="text-zinc-400">
              Execute este setup uma única vez para criar os usuários iniciais do sistema.
            </p>
          </div>

          {!completed && (
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3">Usuários que serão criados:</h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li>• Patrão Admin (patrao@empresa.com) - senha: admin123</li>
                  <li>• Gerente Silva (gerente@empresa.com) - senha: gerente123</li>
                  <li>• Yago Vendedor (yago@empresa.com) - senha: yago123</li>
                  <li>• José Vendedor (jose@empresa.com) - senha: jose123</li>
                  <li>• Maria Coordenadora (maria@empresa.com) - senha: maria123</li>
                </ul>
              </div>

              <Button
                onClick={handleSetup}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Criando usuários...
                  </>
                ) : (
                  "Criar Usuários Iniciais"
                )}
              </Button>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-white">Resultados:</h3>
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                  {result.status === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{result.email}</p>
                    {result.error && <p className="text-sm text-red-400">{result.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {completed && (
            <div className="space-y-4">
              <div className="bg-green-950 border border-green-800 rounded-lg p-4">
                <p className="text-green-400 font-medium">✓ Setup concluído com sucesso!</p>
                <p className="text-green-300 text-sm mt-1">
                  Você já pode fazer login com qualquer um dos usuários criados.
                </p>
              </div>

              <Button
                onClick={() => (window.location.href = "/login")}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                Ir para Login
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
