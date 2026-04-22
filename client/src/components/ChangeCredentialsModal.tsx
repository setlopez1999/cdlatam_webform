import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { KeyRound, AtSign, Loader2, Eye, EyeOff } from "lucide-react";
import { useLocalAuth } from "@/hooks/useLocalAuth";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type UserItem = {
  id: number;
  username: string;
  displayName?: string | null;
  role: string;
};

type Props = {
  /** El usuario cuyas credenciales se van a modificar. */
  user: UserItem;
  /** Callback al cerrar o cancelar el modal. */
  onClose: () => void;
  /** Callback al guardar exitosamente — para que el padre haga refetch. */
  onSaved: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INITIAL_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const INITIAL_USERNAME_FORM = {
  newUsername: "",
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function ChangeCredentialsModal({ user, onClose, onSaved }: Props) {
  const { user: currentUser, isAdmin } = useLocalAuth();
  const isSelf = currentUser?.id === user.id;

  // ── Estado formulario contraseña ──
  const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD_FORM);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Estado formulario username ──
  const [usernameForm, setUsernameForm] = useState(INITIAL_USERNAME_FORM);

  // ── Mutations ──
  const changePasswordMut = trpc.localAuth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Contraseña actualizada correctamente");
      setPasswordForm(INITIAL_PASSWORD_FORM);
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const changeUsernameMut = trpc.localAuth.changeUsername.useMutation({
    onSuccess: () => {
      toast.success(`Usuario cambiado a "${usernameForm.newUsername}"`);
      setUsernameForm(INITIAL_USERNAME_FORM);
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Handlers ──
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    changePasswordMut.mutate({
      targetUserId: user.id,
      currentPassword: passwordForm.currentPassword || undefined,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword,
    });
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameForm.newUsername.trim() === user.username) {
      toast.error("El nuevo usuario es igual al actual");
      return;
    }
    changeUsernameMut.mutate({
      targetUserId: user.id,
      newUsername: usernameForm.newUsername.trim(),
    });
  };

  // Admin cambiando a otro usuario no necesita contraseña actual
  const requiresCurrentPassword = !isAdmin || isSelf;

  const displayName = user.displayName ?? user.username;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Credenciales — @{user.username}
            {user.displayName && (
              <span className="text-muted-foreground font-normal text-sm">({displayName})</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password" className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              Contraseña
            </TabsTrigger>
            <TabsTrigger value="username" className="flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5" />
              Usuario
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Cambio de contraseña ── */}
          <TabsContent value="password">
            <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">

              {/* Contraseña actual — solo si se requiere */}
              {requiresCurrentPassword && (
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña actual</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrent ? "text" : "password"}
                      placeholder="Tu contraseña actual"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                      }
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Nueva contraseña */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNew ? "text" : "password"}
                    placeholder="Mínimo 4 caracteres"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                    }
                    required
                    minLength={4}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repetí la nueva contraseña"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                    }
                    required
                    minLength={4}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Indicador visual de coincidencia */}
                {passwordForm.confirmPassword.length > 0 && (
                  <p
                    className={`text-xs ${
                      passwordForm.newPassword === passwordForm.confirmPassword
                        ? "text-green-600"
                        : "text-destructive"
                    }`}
                  >
                    {passwordForm.newPassword === passwordForm.confirmPassword
                      ? "Las contraseñas coinciden"
                      : "Las contraseñas no coinciden"}
                  </p>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={changePasswordMut.isPending}
                >
                  {changePasswordMut.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4 mr-2" />
                  )}
                  Cambiar contraseña
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* ── Tab: Cambio de username ── */}
          <TabsContent value="username">
            <form onSubmit={handleUsernameSubmit} className="space-y-4 pt-2">

              {/* Username actual (solo lectura, referencia) */}
              <div className="space-y-2">
                <Label>Usuario actual</Label>
                <Input value={user.username} disabled className="bg-muted text-muted-foreground" />
              </div>

              {/* Nuevo username */}
              <div className="space-y-2">
                <Label htmlFor="newUsername">Nuevo usuario</Label>
                <Input
                  id="newUsername"
                  type="text"
                  placeholder="ej: juan.perez"
                  value={usernameForm.newUsername}
                  onChange={(e) =>
                    setUsernameForm({ newUsername: e.target.value })
                  }
                  required
                  minLength={3}
                  maxLength={64}
                  pattern="^[a-zA-Z0-9_.\-]+$"
                  title="Solo letras, números, puntos, guiones y guiones bajos"
                />
                <p className="text-xs text-muted-foreground">
                  Solo letras, números, puntos (<code>.</code>), guiones (<code>-</code>) y guiones bajos (<code>_</code>).
                  Se verificará que no esté en uso.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={changeUsernameMut.isPending}
                >
                  {changeUsernameMut.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <AtSign className="w-4 h-4 mr-2" />
                  )}
                  Cambiar usuario
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
