import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Empleado = {
  id: number;
  nombre: string;
  apellido: string;
  cargo: string | null;
  activo: number;
};

type Props = {
  empleado: Empleado | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditEmpleadoModal({ empleado, open, onClose, onSaved }: Props) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [cargo, setCargo] = useState("");
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (empleado) {
      setNombre(empleado.nombre);
      setApellido(empleado.apellido);
      setCargo(empleado.cargo ?? "");
      setActivo(empleado.activo === 1);
    }
  }, [empleado]);

  const utils = trpc.useUtils();

  const updateEmpleado = trpc.horario.updateEmpleado.useMutation({
    onSuccess: () => {
      utils.horario.listEmpleados.invalidate();
      utils.horario.bloquesSemanales.invalidate();
      onSaved();
      onClose();
    },
  });

  const toggleEmpleado = trpc.horario.toggleEmpleado.useMutation({
    onSuccess: () => {
      utils.horario.listEmpleados.invalidate();
      utils.horario.bloquesSemanales.invalidate();
      onSaved();
      onClose();
    },
  });

  async function handleGuardar() {
    if (!empleado) return;
    if (!nombre.trim() || !apellido.trim()) return;

    const activoActual = empleado.activo === 1;

    // Si cambió el estado activo, hacer toggle
    if (activo !== activoActual) {
      await toggleEmpleado.mutateAsync({ id: empleado.id, activo: activoActual ? 0 : 1 });
    }

    // Actualizar datos básicos
    await updateEmpleado.mutateAsync({
      id: empleado.id,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      cargo: cargo.trim() || undefined,
    });
  }

  const isLoading = updateEmpleado.isPending || toggleEmpleado.isPending;

  if (!empleado) return null;

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Empleado</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Apellido *</Label>
              <Input value={apellido} onChange={e => setApellido(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Cargo</Label>
            <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Técnico, Analista, etc." />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
            <div>
              <p className="text-sm font-medium">Estado del empleado</p>
              <p className="text-xs text-muted-foreground">
                {activo ? "Activo — aparece en el horario semanal" : "Inactivo — oculto del horario semanal"}
              </p>
            </div>
            <Switch checked={activo} onCheckedChange={setActivo} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button
            onClick={handleGuardar}
            disabled={isLoading || !nombre.trim() || !apellido.trim()}
          >
            {isLoading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
