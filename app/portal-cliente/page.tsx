"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package2, Clock, CheckCircle2, Upload, Camera } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Order {
  id: string
  numero: string
  data_criacao: string
  status_carcaca: string
  items: OrderItem[]
}

interface OrderItem {
  id: string
  produto_nome: string
  quantidade: number
  preco_final: number
  debito_carcaca: number
  tipo_venda: string
  devolvido: boolean
}

export default function PortalClientePage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<{ orderId: string; itemId: string } | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [observacoes, setObservacoes] = useState("")
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      // Get client ID for this user
      const { data: clientUser } = await supabase
        .from("client_users")
        .select("client_id")
        .eq("user_id", user?.id)
        .single()

      if (!clientUser) {
        setLoading(false)
        return
      }

      // Get orders for this client
      const { data: ordersData } = await supabase
        .from("orders")
        .select(
          `
          id,
          numero,
          data_criacao,
          status_carcaca,
          order_items (
            id,
            produto_nome,
            quantidade,
            preco_final,
            debito_carcaca,
            tipo_venda,
            devolvido
          )
        `,
        )
        .eq("client_id", clientUser.client_id)
        .order("data_criacao", { ascending: false })

      setOrders(ordersData || [])
    } catch (error) {
      console.error("[v0] Error loading orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMarkAsReturned = async (orderId: string, itemId: string) => {
    setSelectedItem({ orderId, itemId })
    setPhotoFile(null)
    setPhotoPreview(null)
    setObservacoes("")
    setMessage(null)
  }

  const handleSubmitReturn = async () => {
    if (!selectedItem) return

    setUploading(true)
    setMessage(null)

    try {
      let photoUrl = null

      // Upload photo if provided
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop()
        const fileName = `${selectedItem.orderId}_${selectedItem.itemId}_${Date.now()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("return-photos")
          .upload(fileName, photoFile)

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from("return-photos").getPublicUrl(fileName)
        photoUrl = publicUrl
      }

      // Mark item as returned
      const { error: updateError } = await supabase
        .from("order_items")
        .update({ devolvido: true })
        .eq("id", selectedItem.itemId)

      if (updateError) throw updateError

      // Save photo record if uploaded
      if (photoUrl) {
        await supabase.from("return_photos").insert({
          order_id: selectedItem.orderId,
          order_item_id: selectedItem.itemId,
          photo_url: photoUrl,
          uploaded_by: user?.id,
          observacoes: observacoes || null,
        })
      }

      setMessage({ type: "success", text: "Devolução registrada com sucesso!" })
      setSelectedItem(null)
      loadOrders()
    } catch (error) {
      console.error("[v0] Error submitting return:", error)
      setMessage({ type: "error", text: "Erro ao registrar devolução. Tente novamente." })
    } finally {
      setUploading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      aguardando: { variant: "default", label: "Aguardando" },
      atrasado: { variant: "destructive", label: "Atrasado" },
      devolvida: { variant: "default", label: "Devolvida" },
    }
    const config = variants[status] || variants.aguardando
    return (
      <Badge variant={config.variant} className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando pedidos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Package2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Portal do Cliente</h1>
            <p className="text-muted-foreground">Bem-vindo, {user?.name}</p>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {selectedItem && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Registrar Devolução</CardTitle>
              <CardDescription>Informe que está devolvendo este produto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Foto do Produto (Opcional)</Label>
                <div className="flex gap-4">
                  <Button type="button" variant="outline" className="relative bg-transparent" disabled={uploading}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    <Camera className="mr-2 h-4 w-4" />
                    Selecionar Foto
                  </Button>
                  {photoPreview && (
                    <img
                      src={photoPreview || "/placeholder.svg"}
                      alt="Preview"
                      className="h-20 w-20 rounded object-cover"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações (Opcional)</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Adicione observações sobre a devolução..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  disabled={uploading}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubmitReturn} disabled={uploading}>
                  {uploading ? "Enviando..." : "Confirmar Devolução"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedItem(null)} disabled={uploading}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Meus Pedidos</h2>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum pedido encontrado</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Pedido {order.numero}</CardTitle>
                      <CardDescription>
                        <Clock className="inline h-3 w-3 mr-1" />
                        {new Date(order.data_criacao).toLocaleDateString("pt-BR")}
                      </CardDescription>
                    </div>
                    {getStatusBadge(order.status_carcaca)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border p-4 bg-card/50">
                        <div className="flex-1">
                          <p className="font-medium">{item.produto_nome}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantidade: {item.quantidade} | Valor: R$ {item.preco_final.toFixed(2)}
                          </p>
                          {item.tipo_venda === "base-troca" && (
                            <p className="text-sm text-yellow-500">
                              Débito de carcaça: R$ {item.debito_carcaca.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <div>
                          {item.devolvido ? (
                            <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Devolvido
                            </Badge>
                          ) : item.tipo_venda === "base-troca" ? (
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsReturned(order.id, item.id)}
                              disabled={!!selectedItem}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Devolver
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
