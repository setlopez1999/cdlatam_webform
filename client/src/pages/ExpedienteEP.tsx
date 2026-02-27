/**
 * ExpedienteEP - Wrapper que muestra el EPForm dentro del ExpedienteLayout.
 * Ruta: /expediente/:id/ep
 */

import { useParams } from "wouter";
import ExpedienteLayout from "@/components/ExpedienteLayout";
import EPForm from "./EPForm";

export default function ExpedienteEP() {
  const params = useParams<{ id: string }>();
  const expedienteId = params.id;

  return (
    <ExpedienteLayout expedienteId={expedienteId} activeTab="ep">
      <EPForm />
    </ExpedienteLayout>
  );
}
