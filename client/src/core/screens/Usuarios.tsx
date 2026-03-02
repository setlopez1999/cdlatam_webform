import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Users, Plus, Shield, User, Clock, Loader2, RefreshCw,
} from "lucide-react";

export default function Usuarios() {
  const { isAdmin, isLoading: authLoading } = useLocalAuth();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", displayName: "", role: "user" as "user" | "admin" });
  const [creating, setCreating] = useState(false);

  const { data: users, isLoading, refetch } = trpc.localAuth.listUsers.useQuery(undefined, {
    enabled: isAdmin,
  });

  const createUser = trpc.localAuth.createUser.useMutation({
    onSuccess: () => {
      toast.success("Usuario creado correctamente");
      setShowCreate(false);
      setForm({ username: "", password: "", displayName: "", role: "user" });
      refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Shield className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Acceso restringido a administradores</p>
        <Button variant="outline" onClick={() => navigate("/acta")}>Ir a Formularios</Button>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createUser.mutateAsync(form);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (d: Date | null | undefined) => {
    if (!d) return "Nunca";
    return new Date(d).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Administra los usuarios del sistema y sus permisos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Usuario
          </Button>
        </div>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total usuarios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users?.filter(u => u.role === "admin").length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Administradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users?.filter(u => u.role === "user").length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Usuarios regulares</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Usuarios del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !users || users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No hay usuarios registrados</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const initials = (u.displayName ?? u.username)
                  .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className={
                        u.role === "admin"
                          ? "bg-amber-500/15 text-amber-600 text-xs font-semibold"
                          : "bg-blue-500/15 text-blue-600 text-xs font-semibold"
                      }>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {u.displayName ?? u.username}
                        </p>
                        <Badge
                          variant={u.role === "admin" ? "default" : "secondary"}
                          className={cn(
                            "text-xs h-5",
                            u.role === "admin" && "bg-amber-500/15 text-amber-700 border-amber-200 hover:bg-amber-500/20"
                          )}
                        >
                          {u.role === "admin" ? (
                            <><Shield className="w-2.5 h-2.5 mr-1" />Admin</>
                          ) : (
                            <><User className="w-2.5 h-2.5 mr-1" />Usuario</>
                          )}
                        </Badge>
                        {u.isActive !== 1 && (
                          <Badge variant="destructive" className="text-xs h-5">Inactivo</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Último acceso: {formatDate(u.lastSignedIn)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Creado: {formatDate(u.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Crear Nuevo Usuario
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-username">Nombre de usuario *</Label>
              <Input
                id="new-username"
                placeholder="ej: jperez"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required
                minLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-displayName">Nombre completo</Label>
              <Input
                id="new-displayName"
                placeholder="ej: Juan Pérez"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Contraseña *</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 4 caracteres"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Rol</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm(f => ({ ...f, role: v as "user" | "admin" }))}
              >
                <SelectTrigger id="new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      Usuario — Solo formularios propios
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-amber-500" />
                      Administrador — Acceso total
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating || !form.username || !form.password}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Crear Usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper cn
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
