"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit2 } from "lucide-react";
import type { UserRole } from "@/lib/types";
import { getUsers, type DatabaseUser } from "@/lib/supabase/database";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function UsuariosPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<DatabaseUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    password: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [togglingUsers, setTogglingUsers] = useState<Set<string>>(new Set());
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Vendedor" as UserRole,
  });

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      console.log("[v0] Loading users...");
      const usersData = await getUsers();
      console.log("[v0] Users loaded:", usersData?.length, usersData);
      setUsers(usersData || []);
    } catch (error) {
      console.error("[v0] Error loading users:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const filteredUsers = users.filter(
    (user) =>
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (user: DatabaseUser) => {
    setEditingUser(user);
    setEditForm({
      name: user.nome,
      password: "",
    });
    setShowEditDialog(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser) return;

    if (editForm.password && editForm.password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter no mínimo 6 caracteres!",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const updateData: { userId: string; name?: string; password?: string } = {
        userId: editingUser.id,
      };

      if (editForm.name !== editingUser.nome) {
        updateData.name = editForm.name;
      }

      if (editForm.password) {
        updateData.password = editForm.password;
      }

      const response = await fetch("/api/update-user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Erro",
          description: data.error || "Não foi possível atualizar o usuário",
          variant: "destructive",
        });
        setIsUpdating(false);
        return;
      }

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      });

      // Fechar modal e recarregar lista
      setShowEditDialog(false);
      setEditingUser(null);
      setEditForm({ name: "", password: "" });

      setTimeout(() => {
        loadUsers();
      }, 500);
    } catch (error: any) {
      console.error("[v0] Error updating user:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o usuário",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleActive = async (user: DatabaseUser) => {
    if (user.id === currentUser?.id) {
      toast({
        title: "Erro",
        description: "Você não pode desativar seu próprio usuário!",
        variant: "destructive",
      });
      return;
    }

    setTogglingUsers((prev) => new Set(prev).add(user.id));

    try {
      const response = await fetch("/api/update-user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          ativo: !user.ativo,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Erro",
          description:
            data.error || "Não foi possível atualizar o status do usuário",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: `Usuário ${
          !user.ativo ? "ativado" : "desativado"
        } com sucesso!`,
      });

      // Recarregar lista
      setTimeout(() => {
        loadUsers();
      }, 500);
    } catch (error: any) {
      console.error("[v0] Error toggling user active status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do usuário",
        variant: "destructive",
      });
    } finally {
      setTogglingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUserForm),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Erro",
          description: data.error || "Não foi possível criar o usuário",
          variant: "destructive",
        });
        setIsCreating(false);
        return;
      }

      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });

      // Limpar formulário e fechar dialog
      setNewUserForm({
        name: "",
        email: "",
        password: "",
        role: "Vendedor",
      });
      setShowCreateDialog(false);

      // Recarregar lista de usuários após um pequeno delay para garantir que o banco foi atualizado
      setTimeout(() => {
        loadUsers();
      }, 1000);
    } catch (error: any) {
      console.error("[v0] Error creating user:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o usuário",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<
      UserRole,
      { label: string; variant: "default" | "secondary" | "outline" }
    > = {
      admin: { label: "Admin", variant: "default" },
      Gerente: { label: "Gerente", variant: "default" },
      Coordenador: { label: "Coordenador", variant: "secondary" },
      Vendedor: { label: "Vendedor", variant: "outline" },
      operador: { label: "Operador", variant: "secondary" },
      Cliente: { label: "Cliente", variant: "outline" },
    };
    return (
      variants[role] || {
        label: role || "Desconhecido",
        variant: "outline" as const,
      }
    );
  };

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <div className="text-center text-muted-foreground">Carregando...</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Gestão de Usuários
            </h1>
            <p className="text-muted-foreground">
              Controle de acessos e permissões do sistema
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Usuários do Sistema</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      Nome
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      Nível de Acesso
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-4 text-center text-muted-foreground"
                      >
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const roleBadge = getRoleBadge(user.role as UserRole);
                      const isToggling = togglingUsers.has(user.id);
                      return (
                        <tr key={user.id} className="border-b border-border">
                          <td className="py-4 text-sm font-medium text-foreground">
                            {user.nome}
                          </td>
                          <td className="py-4 text-sm text-muted-foreground">
                            {user.email}
                          </td>
                          <td className="py-4">
                            <Badge variant={roleBadge.variant}>
                              {roleBadge.label}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={user.ativo}
                                onCheckedChange={() => handleToggleActive(user)}
                                disabled={
                                  isToggling || user.id === currentUser?.id
                                }
                              />
                              <span className="text-xs text-muted-foreground">
                                {user.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditClick(user)}
                              title="Editar usuário"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
              <h3 className="mb-3 text-sm font-medium">
                Níveis de Acesso do Sistema:
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Admin</p>
                  <p className="text-xs text-muted-foreground">
                    Acesso total: gestão de usuários, produtos, relatórios e
                    todas as funcionalidades
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Gerente</p>
                  <p className="text-xs text-muted-foreground">
                    Acesso completo exceto gestão de usuários e produtos
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Coordenador
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Acesso a vendas, relatórios e gestão da equipe de vendedores
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Vendedor
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Acesso a vendas, clientes e pedidos próprios apenas
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados do novo usuário do sistema
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newUserName">Nome Completo</Label>
                <Input
                  id="newUserName"
                  value={newUserForm.name}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, name: e.target.value })
                  }
                  required
                  minLength={2}
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newUserEmail">Email</Label>
                <Input
                  id="newUserEmail"
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, email: e.target.value })
                  }
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newUserPassword">Senha</Label>
                <Input
                  id="newUserPassword"
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, password: e.target.value })
                  }
                  required
                  minLength={6}
                  disabled={isCreating}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 6 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newUserRole">Nível de Acesso</Label>
                <Select
                  value={newUserForm.role}
                  onValueChange={(value: UserRole) =>
                    setNewUserForm({ ...newUserForm, role: value })
                  }
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vendedor">Vendedor</SelectItem>
                    <SelectItem value="Coordenador">Coordenador</SelectItem>
                    <SelectItem value="Gerente">Gerente</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="operador">Operador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewUserForm({
                      name: "",
                      email: "",
                      password: "",
                      role: "Vendedor",
                    });
                  }}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Criando..." : "Criar Usuário"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Edite as informações do usuário:{" "}
                <strong>{editingUser?.email}</strong>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editUserName">Nome Completo</Label>
                <Input
                  id="editUserName"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                  minLength={2}
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editUserPassword">Nova Senha (opcional)</Label>
                <Input
                  id="editUserPassword"
                  type="password"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm({ ...editForm, password: e.target.value })
                  }
                  minLength={6}
                  disabled={isUpdating}
                  placeholder="Deixe em branco para não alterar"
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para não alterar a senha. Mínimo de 6
                  caracteres se preenchido.
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingUser(null);
                    setEditForm({ name: "", password: "" });
                  }}
                  disabled={isUpdating}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
