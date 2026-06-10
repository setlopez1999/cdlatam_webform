/**
 * ExpedienteActa - Wrapper que muestra el formulario F1 (Acta) dentro del ExpedienteLayout.
 * Ruta: /expediente/:id/acta
 */

import { useParams } from "wouter";
import ExpedienteLayout from "@/components/ExpedienteLayout";
import F1Form from "@/features/expedientes/f1/F1Form";

export default function ExpedienteActa() {
  const params = useParams<{ id: string }>();
  const expedienteId = Number(params.id);

  return (
    <ExpedienteLayout expedienteId={expedienteId} activeTab="acta">
      <F1Form expedienteId={expedienteId} />
    </ExpedienteLayout>
  );
}
