"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SetupCleanPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleSetup = async () => {
    if (!confirm("ATENÇÃO: Esta operação irá:\n\n1. Criar/atualizar 4 usuários padrão:\n   - admin@teste.com (admin)\n   - gerente@teste.com (Gerente)\n   - coordenador@teste.com (Coordenador)\n   - vendedor@teste.com (Vendedor)\n\n2. EXCLUIR TODOS OS OUTROS USUÁRIOS\n\nTem certeza que deseja continuar?")) {
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/setup-clean-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Erro",
          description: data.error || "Não foi possível configurar os usuários",
          variant: "destructive",
        })
        setResult({ error: data.error || "Erro desconhecido" })
        return
      }

      toast({
        title: "Sucesso",
        description: "Usuários configurados com sucesso!",
      })

      setResult(data)
    } catch (error: any) {
      console.error("[v0] Error:", error)
      toast({
        title: "Erro",
        description: "Não foi possível configurar os usuários",
        variant: "destructive",
      })
      setResult({ error: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Configuração Limpa de Usuários</CardTitle>
          <CardDescription>
            Esta ferramenta irá criar os usuários padrão e excluir todos os outros usuários do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta operação é destrutiva e irá excluir permanentemente todos os usuários que não
              sejam os 4 usuários padrão listados abaixo.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="font-semibold">Usuários que serão criados/mantidos:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                <strong>admin@teste.com</strong> - Senha: admin123 (Role: admin)
              </li>
              <li>
                <strong>gerente@teste.com</strong> - Senha: gerente123 (Role: Gerente)
              </li>
              <li>
                <strong>coordenador@teste.com</strong> - Senha: coordenador123 (Role: Coordenador)
              </li>
              <li>
                <strong>vendedor@teste.com</strong> - Senha: vendedor123 (Role: Vendedor)
              </li>
            </ul>
          </div>

          <Button onClick={handleSetup} disabled={isLoading} className="w-full" variant="destructive">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Configurando...
              </>
            ) : (
              "Executar Configuração Limpa"
            )}
          </Button>

          {result && (
            <div className="space-y-2">
              {result.error ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erro:</strong> {result.error}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Sucesso!</strong> Operação concluída.
                    </AlertDescription>
                  </Alert>

                  {result.results && (
                    <div className="rounded-lg border p-4 space-y-2 text-sm">
                      <h4 className="font-semibold">Resumo:</h4>
                      <ul className="space-y-1">
                        <li>
                          <strong>Criados:</strong> {result.results.created}
                        </li>
                        <li>
                          <strong>Já existiam:</strong> {result.results.existing}
                        </li>
                        <li>
                          <strong>Excluídos:</strong> {result.results.deleted}
                        </li>
                        {result.results.errors > 0 && (
                          <li className="text-destructive">
                            <strong>Erros:</strong> {result.results.errors}
                          </li>
                        )}
                      </ul>

                      {result.details && (
                        <div className="mt-4 space-y-3">
                          {result.details.created?.length > 0 && (
                            <div>
                              <strong className="text-green-600">Criados:</strong>
                              <ul className="list-disc list-inside ml-2">
                                {result.details.created.map((u: any) => (
                                  <li key={u.id}>{u.email}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.details.existing?.length > 0 && (
                            <div>
                              <strong className="text-blue-600">Atualizados:</strong>
                              <ul className="list-disc list-inside ml-2">
                                {result.details.existing.map((u: any) => (
                                  <li key={u.id}>{u.email}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.details.deleted?.length > 0 && (
                            <div>
                              <strong className="text-red-600">Excluídos:</strong>
                              <ul className="list-disc list-inside ml-2">
                                {result.details.deleted.map((u: any) => (
                                  <li key={u.id}>{u.email}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.details.errors?.length > 0 && (
                            <div>
                              <strong className="text-destructive">Erros:</strong>
                              <ul className="list-disc list-inside ml-2">
                                {result.details.errors.map((e: any, idx: number) => (
                                  <li key={idx}>
                                    {e.email}: {e.error}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

