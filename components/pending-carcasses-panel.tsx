"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Package, Unlink, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

interface PendingCarcass {
  id: string;
  produto_id: string;
  produto_nome: string;
  quantidade_pendente: number;
  preco_unitario: number;
  pedido_origem: string;
  pedido_id: string;
  data_venda: string;
}

interface PendingCarcassesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pendingItems: PendingCarcass[];
  onSelectItem: (item: PendingCarcass) => void;
  onSelectUnlinkedEntry?: () => void;
  selectedPendingItemIds?: string[]; // IDs dos itens já selecionados (por pedido, não por produto)
  clientName?: string;
}

export function PendingCarcassesPanel({
  isOpen,
  onClose,
  pendingItems,
  onSelectItem,
  onSelectUnlinkedEntry,
  selectedPendingItemIds = [],
  clientName,
}: PendingCarcassesPanelProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Pendências de Carcaças</SheetTitle>
          <SheetDescription>
            {clientName
              ? `Itens pendentes para ${clientName}`
              : "Selecione um cliente para ver as pendências"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 h-full pb-20">
          <ScrollArea className="h-[calc(100vh-180px)] pr-4">
            <div className="space-y-4">
              {/* Opção de entrada sem vínculo - sempre visível */}
              <Card 
                className="cursor-pointer border-dashed border-2 border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors"
                onClick={onSelectUnlinkedEntry}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Unlink className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-primary">
                        Entrada sem vínculo
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Adicionar item pendente para vincular posteriormente a um pedido
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de itens pendentes */}
              {pendingItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhuma carcaça pendente encontrada para este cliente.</p>
                </div>
              ) : (
                <>
                  <div className="pt-2 pb-1">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Pendências vinculadas a pedidos
                    </h4>
                  </div>
                  {pendingItems.map((item) => {
                    // Usa item.id (que é único por pedido) para controlar duplicatas
                    const isAlreadySelected = selectedPendingItemIds.includes(item.id);
                    
                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col gap-2 rounded-lg border p-4 shadow-sm transition-colors ${
                          isAlreadySelected 
                            ? "opacity-60 bg-muted/30" 
                            : "hover:bg-accent/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">
                              {item.produto_nome}
                            </h4>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              <Badge variant="outline" className="h-5 px-1.5 shrink-0">
                                Pedido: #{item.pedido_origem}
                              </Badge>
                              <span className="shrink-0">Qtd: {item.quantidade_pendente}</span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {isAlreadySelected ? (
                              <Badge variant="secondary" className="h-8 px-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <Check className="h-3 w-3 mr-1" />
                                Adicionado
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => onSelectItem(item)}
                                className="h-8 w-8 p-0"
                                title="Adicionar à entrada"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                           Data da Venda: {new Date(item.data_venda).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
