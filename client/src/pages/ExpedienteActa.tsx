/**
 * ExpedienteActa - Wrapper que muestra el ActaForm dentro del ExpedienteLayout.
 * Ruta: /expediente/:id/acta
 */

import { useParams } from "wouter";
import ExpedienteLayout from "@/components/ExpedienteLayout";
import ActaForm from "./ActaForm";

export default function ExpedienteActa() {
  const params = useParams<{ id: string }>();
  const expedienteId = params.id;

  return (
    <ExpedienteLayout expedienteId={expedienteId} activeTab="acta">
      <ActaForm />
    </ExpedienteLayout>
  );
}
