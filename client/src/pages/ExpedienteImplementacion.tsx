/**
 * ExpedienteImplementacion — Tab de Implementación (Fase 1: placeholder).
 *
 * Esta pestaña está reservada para el módulo de Implementación.
 * Los campos y funcionalidades se definirán en coordinación con Martín.
 * Ver docs/ARQUITECTURA_EXPEDIENTES_INTEGRIDAD.md para el contexto completo.
 */

import { useParams } from "wouter";
import { Rocket, Clock } from "lucide-react";
import ExpedienteLayout from "@/components/ExpedienteLayout";

export default function ExpedienteImplementacion() {
  const params = useParams<{ id: string }>();
  const expedienteId = params.id ?? "";

  return (
    <ExpedienteLayout expedienteId={expedienteId} activeTab="implementacion">
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 text-center px-6">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/20">
          <Rocket className="w-9 h-9 text-primary/70" />
        </div>

        <div className="space-y-2 max-w-sm">
          <h2 className="text-xl font-semibold text-foreground">
            Módulo de Implementación
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Este módulo está en desarrollo. Pronto podrás gestionar el proceso
            de implementación directamente desde el expediente.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 border border-border/40 rounded-full px-4 py-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Próximamente</span>
        </div>
      </div>
    </ExpedienteLayout>
  );
}
