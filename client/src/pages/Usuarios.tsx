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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, Plus, Shield, User, Clock, Loader2, RefreshCw, Power, Pencil, Tag, Trash2, AlertTriangle, KeyRound } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { EditUserModal } from "@/components/EditUserModal";
import { CreateUserModal } from "@/components/CreateUserModal";
import { ChangeCredentialsModal } from "@/components/ChangeCredentialsModal";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type UserItem = {
  id: number; username: string; displayName?: string | null;
  role: string; roleId?: number | null; isActive: number;
  createdAt?: Date | null; lastSignedIn?: Date | null;
};
type RoleItem = {
  id: number; nombre: string; label: string;
  descripcion?: string | null; activo: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }) : "Nunca";

const initials = (u: UserItem) =>
  (u.displayName ?? u.username).split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Usuarios() {
  const { isAdmin, isLoading: authLoading } = useLocalAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"usuarios" | "roles">("usuarios");

  // ── Estado modales usuarios ──
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [credentialsUser, setCredentialsUser] = useState<UserItem | null>(null);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<UserItem | null>(null);

  // ── Estado modales roles ──
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editRole, setEditRole] = useState<RoleItem | null>(null);
  const [roleForm, setRoleForm] = useState({ nombre: "", label: "", descripcion: "" });
  const [creatingRole, setCreatingRole] = useState(false);
  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState<{ role: RoleItem; affected: UserItem[] } | null>(null);
  const [pendingDeleteRole, setPendingDeleteRole] = useState<RoleItem | null>(null);

  // ── Queries ──
  const { data: users, isLoading: loadingUsers, refetch: refetchUsers } =
    trpc.localAuth.listUsers.useQuery(undefined, { enabled: isAdmin });

  const { data: roles, isLoading: loadingRoles, refetch: refetchRoles } =
    trpc.roles.list.useQuery(undefined, { enabled: isAdmin });

  // ── Mutations usuarios ──
  const toggleStatusMut = trpc.localAuth.toggleStatus.useMutation();
  const deleteUserMut = trpc.localAuth.deleteUser.useMutation({
    onSuccess: () => { toast.success("Usuario eliminado permanentemente"); setDeleteUserConfirm(null); refetchUsers(); },
    onError: (e) => toast.error(e.message),
  });

  // ── Mutations roles ──
  const createRoleMut = trpc.roles.create.useMutation({
    onSuccess: () => { toast.success("Rol creado"); setShowCreateRole(false); resetRoleForm(); refetchRoles(); },
    onError: (e) => toast.error(e.message),
  });
  const updateRoleMut = trpc.roles.update.useMutation({
    onSuccess: () => { toast.success("Rol actualizado"); setEditRole(null); refetchRoles(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteRoleMut = trpc.roles.delete.useMutation({
    onSuccess: async (res: any) => {
      if (res.requiresConfirm) {
        setDeleteRoleConfirm({ role: pendingDeleteRole!, affected: res.affected });
      } else {
        toast.success("Rol eliminado"); setPendingDeleteRole(null); refetchRoles(); refetchUsers();
      }
    },
    onError: (e) => { toast.error(e.message); setPendingDeleteRole(null); },
  });
  const deleteRoleForceMut = trpc.roles.deleteForce.useMutation({
    onSuccess: () => { toast.success("Rol eliminado y usuarios desasignados"); setDeleteRoleConfirm(null); setPendingDeleteRole(null); refetchRoles(); refetchUsers(); },
    onError: (e) => toast.error(e.message),
  });

  // ── Helpers de reset ──
  const resetRoleForm = () => setRoleForm({ nombre: "", label: "", descripcion: "" });

  const openEditUser = (u: UserItem) => {
    setEditUser(u);
  };

  const openEditRole = (r: RoleItem) => {
    setRoleForm({ nombre: r.nombre, label: r.label, descripcion: r.descripcion ?? "" });
    setEditRole(r);
  };

  const handleToggleStatus = async (u: UserItem) => {
    const isActivo = Boolean(u.isActive);
    if (!confirm(`¿Seguro que deseas ${isActivo ? "desactivar" : "activar"} la cuenta de ${u.username}?`)) return;
    try {
      await toggleStatusMut.mutateAsync({ id: u.id, isActive: isActivo ? 0 : 1 });
      toast.success(`Cuenta ${isActivo ? "inactivada" : "activada"}`);
      refetchUsers();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault(); setCreatingRole(true);
    try { await createRoleMut.mutateAsync(roleForm); }
    finally { setCreatingRole(false); }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRole) return;
    await updateRoleMut.mutateAsync({ id: editRole.id, ...roleForm });
  };

  const handleDeleteRole = (r: RoleItem) => {
    // Mostrar confirmación simple antes de borrar
    setPendingDeleteRole(r);
  };

  const confirmDeleteRole = async () => {
    if (!pendingDeleteRole) return;
    await deleteRoleMut.mutateAsync({ id: pendingDeleteRole.id });
  };

  // ── Stats ──
  const totalUsers = users?.length ?? 0;
  const adminCount = users?.filter(u => u.role === "admin").length ?? 0;
  const totalRoles = roles?.length ?? 0;

  // ── Guards ──
  if (authLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Shield className="w-12 h-12 text-muted-foreground/30" />
      <p className="text-muted-foreground">Acceso restringido a administradores</p>
      <Button variant="outline" onClick={() => navigate("/nuevo-expediente")}>Ir a Formularios</Button>
    </div>
  );

  const getRoleBadge = (u: UserItem) => {
    const r = roles?.find(r => r.id === u.roleId);
    if (r) return <Badge variant="outline" className="text-xs h-5 border-violet-300 text-violet-700 bg-violet-50"><Tag className="w-2.5 h-2.5 mr-1" />{r.label}</Badge>;
    if (u.role === "admin") return <Badge variant="default" className="text-xs h-5 bg-amber-500/15 text-amber-700 border-amber-200"><Shield className="w-2.5 h-2.5 mr-1" />Admin</Badge>;
    return <Badge variant="secondary" className="text-xs h-5"><User className="w-2.5 h-2.5 mr-1" />Usuario</Badge>;
  };

  return (
    <PageLayout
      title="Gestión de Usuarios"
      subtitle="Administra los usuarios del sistema y sus permisos"
      icon={<Users className="w-6 h-6 text-primary" />}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => { refetchUsers(); refetchRoles(); }}>
            <RefreshCw className="w-4 h-4 mr-1.5" />Actualizar
          </Button>
          {activeTab === "usuarios"
            ? <Button size="sm" onClick={() => setShowCreateUser(true)}><Plus className="w-4 h-4 mr-1.5" />Nuevo Usuario</Button>
            : <Button size="sm" onClick={() => setShowCreateRole(true)}><Plus className="w-4 h-4 mr-1.5" />Nuevo Rol</Button>
          }
        </>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total usuarios", value: totalUsers, icon: Users, color: "primary" },
          { label: "Administradores", value: adminCount, icon: Shield, color: "amber" },
          { label: "Roles definidos", value: totalRoles, icon: Tag, color: "violet" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg bg-${color}-500/10 flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 text-${color}-500`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="mb-2">
          <TabsTrigger value="usuarios" className="gap-2"><Users className="w-4 h-4" />Usuarios del Sistema</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2"><Tag className="w-4 h-4" />Roles del Sistema</TabsTrigger>
        </TabsList>

        {/* ── Tab Usuarios ── */}
        <TabsContent value="usuarios">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Usuarios del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : !users?.length ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No hay usuarios registrados</p>
              ) : (
                <div className="space-y-2">
                  {users.map((u: UserItem) => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className={u.role === "admin" ? "bg-amber-500/15 text-amber-600 text-xs font-semibold" : "bg-blue-500/15 text-blue-600 text-xs font-semibold"}>
                          {initials(u)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate" translate="no">{u.displayName ?? u.username}</p>
                          {getRoleBadge(u)}
                          {u.isActive !== 1 && <Badge variant="destructive" className="text-xs h-5">Inactivo</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground" translate="no">@{u.username}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Último acceso: {formatDate(u.lastSignedIn)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Creado: {formatDate(u.createdAt)}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => openEditUser(u)} title="Editar usuario"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setCredentialsUser(u)} title="Cambiar contraseña o usuario"
                        className="h-8 w-8 text-muted-foreground hover:text-sky-500 hover:bg-sky-500/10">
                        <KeyRound className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(u)} disabled={toggleStatusMut.isPending}
                        title={u.isActive ? "Desactivar" : "Activar"}
                        className={`h-8 w-8 ${u.isActive ? "text-orange-400 hover:text-orange-300 hover:bg-orange-500/10" : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"}`}>
                        <Power className="w-4 h-4" />
                      </Button>
                      {/* Botón eliminar: solo visible en cuentas desactivadas */}
                      {u.isActive === 0 && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteUserConfirm(u)}
                          title="Eliminar usuario permanentemente"
                          className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Roles ── */}
        <TabsContent value="roles">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Roles del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRoles ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : !roles?.length ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No hay roles definidos</p>
              ) : (
                <div className="space-y-2">
                  {roles.map((r: RoleItem) => {
                    const assignedCount = users?.filter(u => u.roleId === r.id).length ?? 0;
                    return (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                          <Tag className="w-4 h-4 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium" translate="no">{r.label}</p>
                            <Badge variant="outline" className="text-xs h-5 font-mono" translate="no">{r.nombre}</Badge>
                            {r.activo !== 1 && <Badge variant="destructive" className="text-xs h-5">Inactivo</Badge>}
                          </div>
                          {r.descripcion && <p className="text-xs text-muted-foreground truncate">{r.descripcion}</p>}
                        </div>
                        <div className="text-right text-xs text-muted-foreground hidden sm:block">
                          <p>{assignedCount} usuario{assignedCount !== 1 ? "s" : ""} asignado{assignedCount !== 1 ? "s" : ""}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openEditRole(r)} title="Editar rol"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(r)} title="Eliminar rol"
                          className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                          disabled={deleteRoleMut.isPending}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modal Crear Usuario ── */}
      {showCreateUser && roles && (
        <CreateUserModal
          roles={roles as any[]}
          onClose={() => setShowCreateUser(false)}
          onCreated={() => { refetchUsers(); }}
        />
      )}

      {/* ── Modal Editar Usuario ── key={editUser.id} hace que React remonte el
           componente al cambiar de usuario, lo que permite usar useState(initialRoles)
           directamente sin necesidad de useEffect para sincronizar estado derivado. */}
      {editUser && roles && (
        <EditUserModal
          key={editUser.id}
          user={editUser}
          roles={roles as any[]}
          onClose={() => setEditUser(null)}
          onSaved={() => refetchUsers()}
        />
      )}

      {/* ── Modal Cambiar Credenciales (contraseña / username) ── */}
      {credentialsUser && (
        <ChangeCredentialsModal
          key={credentialsUser.id}
          user={credentialsUser}
          onClose={() => setCredentialsUser(null)}
          onSaved={() => refetchUsers()}
        />
      )}

      {/* ── Modal Crear Rol ── */}
      <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="w-4 h-4" />Crear Nuevo Rol</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRole} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre interno * <span className="text-muted-foreground text-xs">(sin espacios, ej: gerente_ventas)</span></Label>
              <Input placeholder="ej: gerente_ventas" value={roleForm.nombre} onChange={e => setRoleForm(f => ({ ...f, nombre: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} required minLength={2} translate="no" />
            </div>
            <div className="space-y-2">
              <Label>Etiqueta visible *</Label>
              <Input placeholder="ej: Gerente de Ventas" value={roleForm.label} onChange={e => setRoleForm(f => ({ ...f, label: e.target.value }))} required minLength={2} translate="no" />
            </div>
            <div className="space-y-2">
              <Label>Descripción <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input placeholder="ej: Acceso a reportes de ventas" value={roleForm.descripcion} onChange={e => setRoleForm(f => ({ ...f, descripcion: e.target.value }))} translate="no" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowCreateRole(false); resetRoleForm(); }}>Cancelar</Button>
              <Button type="submit" disabled={creatingRole || !roleForm.nombre || !roleForm.label}>
                {creatingRole ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Crear Rol
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal Editar Rol ── */}
      <Dialog open={!!editRole && !deleteRoleConfirm} onOpenChange={(o) => { if (!o) setEditRole(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="w-4 h-4" />Editar Rol — <span translate="no">{editRole?.nombre}</span></DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateRole} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre interno *</Label>
              <Input value={roleForm.nombre} onChange={e => setRoleForm(f => ({ ...f, nombre: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} required minLength={2} translate="no" />
            </div>
            <div className="space-y-2">
              <Label>Etiqueta visible *</Label>
              <Input value={roleForm.label} onChange={e => setRoleForm(f => ({ ...f, label: e.target.value }))} required minLength={2} translate="no" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={roleForm.descripcion} onChange={e => setRoleForm(f => ({ ...f, descripcion: e.target.value }))} translate="no" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditRole(null)}>Cancelar</Button>
              <Button type="submit" disabled={updateRoleMut.isPending}>
                {updateRoleMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pencil className="w-4 h-4 mr-2" />}Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal Confirmación simple de eliminación de rol ── */}
      <Dialog open={!!pendingDeleteRole && !deleteRoleConfirm} onOpenChange={(o) => { if (!o) setPendingDeleteRole(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />Eliminar rol
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas eliminar el rol <strong translate="no">{pendingDeleteRole?.label}</strong>? Esta acción no se puede deshacer.
          </p>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setPendingDeleteRole(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteRoleMut.isPending} onClick={confirmDeleteRole}>
              {deleteRoleMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Confirmar Eliminar Rol (con usuarios afectados) ── */}
      <Dialog open={!!deleteRoleConfirm} onOpenChange={(o) => { if (!o) { setDeleteRoleConfirm(null); setPendingDeleteRole(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />Confirmar eliminación de rol
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              El rol <strong translate="no">{deleteRoleConfirm?.role.label}</strong> está asignado a los siguientes usuarios:
            </p>
            <div className="rounded-lg border border-border divide-y divide-border max-h-40 overflow-y-auto">
              {deleteRoleConfirm?.affected.map((u: any) => (
                <div key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{u.displayName ?? u.username}</span>
                  <span className="text-muted-foreground text-xs">@{u.username}</span>
                </div>
              ))}
            </div>
            <p className="text-sm">Si eliminas el rol, estos usuarios quedarán <strong>sin rol asignado</strong>. ¿Deseas continuar?</p>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setDeleteRoleConfirm(null); setEditRole(null); }}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteRoleForceMut.isPending}
              onClick={() => deleteRoleConfirm && deleteRoleForceMut.mutate({ id: deleteRoleConfirm.role.id })}>
              {deleteRoleForceMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Sí, eliminar rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Modal Confirmar Eliminar Usuario ── */}
      <Dialog open={!!deleteUserConfirm} onOpenChange={(o) => { if (!o) setDeleteUserConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />Eliminar usuario permanentemente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Estás a punto de eliminar la cuenta de{" "}
              <strong translate="no">{deleteUserConfirm?.displayName ?? deleteUserConfirm?.username}</strong>{" "}
              (<span className="font-mono text-xs" translate="no">@{deleteUserConfirm?.username}</span>).
            </p>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-600 space-y-1">
              <p>• La cuenta será eliminada de forma permanente.</p>
              <p>• Sus expedientes quedarán en el sistema con un indicador de usuario eliminado.</p>
              <p>• Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteUserConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteUserMut.isPending}
              onClick={() => deleteUserConfirm && deleteUserMut.mutate({ id: deleteUserConfirm.id })}>
              {deleteUserMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
