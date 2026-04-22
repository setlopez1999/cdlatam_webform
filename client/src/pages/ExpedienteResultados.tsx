/**
 * ExpedienteResultados - Muestra los resultados calculados del expediente.
 * Ruta: /expediente/:id/resultados
 * Delega todo el render a F3View (features/expedientes/f3/F3View.tsx).
 */

import { useParams, useLocation } from "wouter";
import ExpedienteLayout from "@/components/ExpedienteLayout";
import F3View from "@/features/expedientes/f3/F3View";

export default function ExpedienteResultados() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const expedienteId = params.id;

  return (
    <ExpedienteLayout expedienteId={expedienteId} activeTab="resultados">
      <F3View
        expedienteId={expedienteId}
        onVolverF2={() => navigate(`/expediente/${expedienteId}/ep`)}
      />
    </ExpedienteLayout>
  );
}
