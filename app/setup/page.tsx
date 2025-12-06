"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [updatingRoles, setUpdatingRoles] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [completed, setCompleted] = useState(false)
  const [rolesUpdated, setRolesUpdated] = useState(false)

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

  const handleUpdateRoles = async () => {
    setUpdatingRoles(true)

    try {
      const response = await fetch("/api/update-roles", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setRolesUpdated(true)
        alert(`Roles atualizados com sucesso! ${data.updated} perfil(is) atualizado(s).`)
      } else {
        let errorMessage = "Erro ao atualizar roles: " + data.error + "\n\n"
        if (data.instructions) {
          errorMessage += "Instruções:\n" + data.instructions
        }
        if (data.sql_script) {
          errorMessage += `\n\nExecute o script: ${data.sql_script}`
        }
        alert(errorMessage)
      }
    } catch (error: any) {
      alert("Erro: " + error.message)
    } finally {
      setUpdatingRoles(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white border-gray-200 p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Configuração Inicial</h1>
            <p className="text-slate-600">
              Execute este setup uma única vez para criar os usuários iniciais do sistema.
            </p>
          </div>

          {!completed && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Atualização de Roles</h3>
                <p className="text-yellow-700 text-sm mb-3">
                  Se você já tem usuários criados com role "Patrão", clique no botão abaixo para atualizar para "admin".
                </p>
                <Button
                  onClick={handleUpdateRoles}
                  disabled={updatingRoles || rolesUpdated}
                  variant="outline"
                  className="w-full border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                  size="sm"
                >
                  {updatingRoles ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : rolesUpdated ? (
                    "✓ Roles Atualizados"
                  ) : (
                    "Atualizar Roles (Patrão → admin)"
                  )}
                </Button>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-3">Usuários que serão criados:</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Admin (patrao@empresa.com) - senha: admin123</li>
                  <li>• Gerente Silva (gerente@empresa.com) - senha: gerente123</li>
                  <li>• Yago Vendedor (yago@empresa.com) - senha: yago123</li>
                  <li>• José Vendedor (jose@empresa.com) - senha: jose123</li>
                  <li>• Maria Coordenadora (maria@empresa.com) - senha: maria123</li>
                </ul>
              </div>

              <Button
                onClick={handleSetup}
                disabled={loading}
                className="w-full"
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
              <h3 className="font-semibold text-slate-800">Resultados:</h3>
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  {result.status === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-medium">{result.email}</p>
                    {result.error && <p className="text-sm text-red-600">{result.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {completed && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">✓ Setup concluído com sucesso!</p>
                <p className="text-green-700 text-sm mt-1">
                  Você já pode fazer login com qualquer um dos usuários criados.
                </p>
              </div>

              <Button
                onClick={() => (window.location.href = "/login")}
                className="w-full"
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
