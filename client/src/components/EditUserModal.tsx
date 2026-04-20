import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Pencil, Shield, User, Loader2 } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type UserItem = {
  id: number; username: string; displayName?: string | null;
  role: string; roleId?: number | null; isActive: number;
};
type RoleItem = {
  id: number; nombre: string; label: string;
  descripcion?: string | null; activo: number;
};
type UserRoleItem = { roleId: number };

type Props = {
  /** El usuario a editar. Cuando es null el modal está cerrado. */
  user: UserItem;
  /** Lista de todos los roles disponibles en el sistema. */
  roles: RoleItem[];
  /** Roles RBAC actuales del usuario — se usan como valor inicial de los checkboxes. */
  initialRoles: UserRoleItem[];
  /** Callback al cerrar o cancelar el modal. */
  onClose: () => void;
  /** Callback al guardar exitosamente — para que el padre haga refetch. */
  onSaved: () => void;
};

/**
 * Modal de edición de usuario con RBAC.
 *
 * Patrón: este componente recibe `initialRoles` como prop y lo usa directamente
 * en useState — funciona correctamente porque el padre le pasa `key={user.id}`,
 * lo que hace que React desmonte y remonte el componente cada vez que cambia el
 * usuario. Esto evita el antipatrón useEffect para sincronizar estado derivado.
 */
export function EditUserModal({ user, roles, initialRoles, onClose, onSaved }: Props) {
  // Estado del formulario — inicializado una sola vez al montar el componente
  const [form, setForm] = useState({
    displayName: user.displayName ?? "",
    role: (user.role as "user" | "admin"),
    roleId: user.roleId ?? null as number | null,
  });

  // Checkboxes RBAC — inicializados directamente desde initialRoles (no useEffect)
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>(
    initialRoles.map(r => r.roleId)
  );

  // Mutations
  const updateUserMut = trpc.localAuth.updateUser.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const setUserRolesMut = trpc.userRoles.setRoles.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserMut.mutateAsync({
        id: user.id,
        displayName: form.displayName,
        role: form.role,
        roleId: form.roleId,
      });
      await setUserRolesMut.mutateAsync({
        userId: user.id,
        roleIds: selectedRoleIds,
      });
      toast.success("Usuario actualizado");
      onSaved();
      onClose();
    } catch {
      // Los errores ya se muestran con toast en onError de cada mutation
    }
  };

  const isPending = updateUserMut.isPending || setUserRolesMut.isPending;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />Editar Usuario — @{user.username}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre completo */}
          <div className="space-y-2">
            <Label>Nombre completo</Label>
            <Input
              placeholder="ej: Juan Pérez"
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
            />
          </div>

          {/* Permiso base */}
          <div className="space-y-2">
            <Label>Permiso base</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm(f => ({ ...f, role: v as "user" | "admin" }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-blue-500" />Usuario
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-amber-500" />Administrador
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Roles RBAC */}
          {roles.length > 0 && (
            <div className="space-y-2">
              <Label>
                Roles RBAC{" "}
                <span className="text-muted-foreground text-xs">(acceso a pantallas específicas)</span>
              </Label>
              <div className="rounded-lg border border-border p-3 space-y-2 max-h-40 overflow-y-auto">
                {roles.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`role-${r.id}`}
                      checked={selectedRoleIds.includes(r.id)}
                      onCheckedChange={(checked) => {
                        setSelectedRoleIds(prev =>
                          checked ? [...prev, r.id] : prev.filter(id => id !== r.id)
                        );
                      }}
                    />
                    <label htmlFor={`role-${r.id}`} className="text-sm cursor-pointer flex-1">
                      <span className="font-medium">{r.label}</span>
                      {r.descripcion && (
                        <span className="text-muted-foreground text-xs ml-2">{r.descripcion}</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Pencil className="w-4 h-4 mr-2" />
              }
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
