/**
 * GestorHorarios.tsx — Pantalla de Gestión de Horarios
 *
 * Accesible únicamente para usuarios con el rol "gestor_horarios" (o admin).
 * La protección de acceso se aplica en dos capas:
 *   1. Servidor: requireAnyRole(ctx, ["gestor_horarios"]) en el endpoint tRPC
 *   2. Cliente: ProtectedRoute con requiredRole="gestor_horarios" en App.tsx
 */

import { CalendarClock } from "lucide-react";
import { useLocalAuth } from "@/hooks/useLocalAuth";

export default function GestorHorarios() {
  const { currentUser } = useLocalAuth();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <CalendarClock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestor de Horarios</h1>
          <p className="text-sm text-muted-foreground">
            Gestión y planificación de horarios del equipo
          </p>
        </div>
      </div>

      {/* Placeholder de contenido */}
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 flex flex-col items-center justify-center gap-4 text-center">
        <CalendarClock className="w-12 h-12 text-muted-foreground/40" />
        <div>
          <p className="text-lg font-medium text-muted-foreground">
            Módulo en construcción
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Aquí irá la funcionalidad de gestión de horarios.
          </p>
        </div>
        <div className="mt-2 px-4 py-2 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-xs text-primary/70">
            Accediendo como: <span className="font-semibold">{currentUser?.displayName ?? currentUser?.username}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
