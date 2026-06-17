import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type RoleItem = {
  id: number; nombre: string; label: string;
  descripcion?: string | null; activo: number;
};

type Props = {
  /** Lista de todos los roles disponibles en el sistema. */
  roles: RoleItem[];
  /** Callback al cerrar o cancelar el modal. */
  onClose: () => void;
  /** Callback al crear exitosamente — para que el padre haga refetch. */
  onCreated: () => void;
};

/**
 * Modal de creación de usuario con RBAC.
 *
 * Permite crear un usuario con:
 * - username y password
 * - displayName opcional
 * - roles RBAC seleccionados mediante checkboxes
 *
 * Al crear el usuario, primero inserta en `users` y luego
 * asigna los roles seleccionados en `user_roles`.
 */
export function CreateUserModal({ roles, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  // Mutation para crear el usuario en `users`
  const createUserMut = trpc.localAuth.createUser.useMutation({
    onError: (e) => toast.error(e.message),
  });

  // Mutation para asignar roles RBAC en `user_roles`
  const setUserRolesMut = trpc.userRoles.setRoles.useMutation({
    onError: (e) => toast.error(e.message),
  });

  // Query para obtener el usuario recién creado por username (para obtener su id)
  const utils = trpc.useUtils();

  const handleToggleRole = (roleId: number, checked: boolean) => {
    setSelectedRoleIds(prev =>
      checked ? [...prev, roleId] : prev.filter(id => id !== roleId)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Crear el usuario en `users`
      await createUserMut.mutateAsync({
        username: form.username,
        password: form.password,
        displayName: form.displayName || undefined,
      });

      // 2. Obtener el id del usuario recién creado para asignar roles
      if (selectedRoleIds.length > 0) {
        // Refetch de la lista de usuarios para obtener el id del nuevo usuario
        const users = await utils.localAuth.listUsers.fetch();
        const newUser = users?.find((u: { username: string }) => u.username === form.username);
        if (newUser) {
          await setUserRolesMut.mutateAsync({
            userId: newUser.id,
            roleIds: selectedRoleIds,
          });
        }
      }

      toast.success("Usuario creado correctamente");
      onCreated();
    } catch {
      // Los errores ya se muestran con toast en onError de cada mutation
    } finally {
      setSaving(false);
    }
  };

  const isValid = form.username.length >= 3 && form.password.length >= 4;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" />Crear Nuevo Usuario
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-2">
            <Label>Nombre de usuario *</Label>
            <Input
              placeholder="ej: juan.perez"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s+/g, ".") }))}
              required
              minLength={3}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label>Contraseña *</Label>
            <Input
              type="password"
              placeholder="Mínimo 4 caracteres"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              minLength={4}
            />
          </div>

          {/* Nombre completo */}
          <div className="space-y-2">
            <Label>Nombre completo <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input
              placeholder="ej: Juan Pérez"
              value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
            />
          </div>

          {/* Roles RBAC */}
          {roles.length > 0 && (
            <div className="space-y-2">
              <Label>
                Roles{" "}
                <span className="text-muted-foreground text-xs">(acceso a pantallas del sistema)</span>
              </Label>
              <div className="rounded-lg border border-border p-3 space-y-2 max-h-40 overflow-y-auto">
                {roles.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`new-role-${r.id}`}
                      checked={selectedRoleIds.includes(r.id)}
                      onCheckedChange={(checked) => handleToggleRole(r.id, Boolean(checked))}
                    />
                    <label htmlFor={`new-role-${r.id}`} className="text-sm cursor-pointer flex-1">
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
            <Button type="submit" disabled={saving || !isValid}>
              {saving
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Plus className="w-4 h-4 mr-2" />
              }
              Crear Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
