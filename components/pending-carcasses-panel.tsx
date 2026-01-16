"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  clientName?: string;
}

export function PendingCarcassesPanel({
  isOpen,
  onClose,
  pendingItems,
  onSelectItem,
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
          {pendingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhuma carcaça pendente encontrada para este cliente.</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-180px)] pr-4">
              <div className="space-y-4">
                {pendingItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 shadow-sm hover:bg-accent/5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm">
                          {item.produto_nome}
                        </h4>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="h-5 px-1.5">
                            Pedido: #{item.pedido_origem}
                          </Badge>
                          <span>Qtd: {item.quantidade_pendente}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onSelectItem(item)}
                        className="h-8 w-8 p-0"
                        title="Adicionar à entrada"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                       Data da Venda: {new Date(item.data_venda).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
