/**
 * ExpedienteImplementacion — Checklist de implementación IPTV-OTT por expediente.
 * Ruta: /expediente/:id/implementacion
 */

import { useParams } from "wouter";
import ExpedienteLayout from "@/components/ExpedienteLayout";
import ImplementacionView from "@/features/expedientes/implementacion/ImplementacionView";

export default function ExpedienteImplementacion() {
  const params = useParams<{ id: string }>();
  const expedienteId = params.id ?? "";

  return (
    <ExpedienteLayout expedienteId={expedienteId} activeTab="implementacion">
      <ImplementacionView expedienteId={expedienteId} />
    </ExpedienteLayout>
  );
}
