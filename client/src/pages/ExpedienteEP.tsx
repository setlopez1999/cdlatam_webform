/**
 * ExpedienteEP - Wrapper que muestra el EPForm dentro del ExpedienteLayout.
 * Ruta: /expediente/:id/ep
 */

import { useParams } from "wouter";
import ExpedienteLayout from "@/components/ExpedienteLayout";
import F2Form from "@/features/expedientes/f2/F2Form";

export default function ExpedienteEP() {
  const params = useParams<{ id: string }>();
  const expedienteId = params.id;

  return (
    <ExpedienteLayout expedienteId={expedienteId} activeTab="ep">
      <F2Form expedienteId={expedienteId} />
    </ExpedienteLayout>
  );
}
