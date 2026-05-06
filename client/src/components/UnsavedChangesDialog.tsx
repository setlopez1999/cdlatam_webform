/**
 * UnsavedChangesDialog
 *
 * Modal que aparece cuando el usuario intenta salir de F1 o F2 con cambios
 * sin guardar. Tres acciones:
 *   - Guardar y salir: invoca `onSave()`. Si la promesa resuelve `true` el
 *     caller (F1Form/F2Form) debe ocultar el modal cambiando `open` a false.
 *   - Descartar y salir: invoca `onDiscard()` para revertir al estado de la
 *     BD y luego el caller cierra el modal.
 *   - Cancelar: cierra el modal y mantiene al usuario en el formulario.
 *
 * Los botones de acción async usan `<Button>` (no `AlertDialogAction`) para
 * que el cierre del modal lo controle 100% el padre vía la prop `open`.
 * Esto evita race conditions con el cierre automático que hace `AlertDialogAction`.
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  /** Etiqueta del formulario afectado, p. ej. "F1" o "F2" */
  formLabel: string;
  /** Llamado al click "Guardar y salir". Debe resolver true si tuvo éxito. */
  onSave: () => Promise<boolean>;
  /** Llamado al click "Descartar y salir". Resuelve al terminar. */
  onDiscard: () => Promise<void>;
  /** Llamado al click "Cancelar" o al cerrar el modal con Esc / click fuera. */
  onCancel: () => void;
}

export function UnsavedChangesDialog({ open, formLabel, onSave, onDiscard, onCancel }: Props) {
  const [busy, setBusy] = useState<"save" | "discard" | null>(null);

  const handleSave = async () => {
    if (busy) return;
    setBusy("save");
    try {
      await onSave();
    } finally {
      setBusy(null);
    }
  };

  const handleDiscard = async () => {
    if (busy) return;
    setBusy("discard");
    try {
      await onDiscard();
    } finally {
      setBusy(null);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={isOpen => {
        // Solo escuchamos el cierre (Esc / click fuera). El abrir lo controla el padre.
        if (!isOpen && !busy) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cambios sin guardar en {formLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            Tienes cambios pendientes en el formulario {formLabel} de este expediente.
            Si sales sin guardar, esos cambios se perderán al refrescar la página o
            entrar desde otro dispositivo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={!!busy} onClick={onCancel}>
            Cancelar
          </AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            disabled={!!busy}
            onClick={handleDiscard}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/40"
          >
            {busy === "discard" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Descartando…
              </>
            ) : (
              "Descartar y salir"
            )}
          </Button>
          <Button type="button" disabled={!!busy} onClick={handleSave}>
            {busy === "save" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Guardando…
              </>
            ) : (
              "Guardar y salir"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
